package com.antiz.metube.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class YoutubeDownloadService {

    private static final String YT_DLP_ENV = "YT_DLP_PATH";
    private static final String FFMPEG_ENV = "FFMPEG_PATH";
    private static final String FALLBACK_YT_DLP = "yt-dlp";
    private static final String FALLBACK_FFMPEG = "ffmpeg";
    private static final long CACHE_TTL_HOURS = 6;

    private static final Path COOKIES_PATH = Paths.get("/tmp/yt_cookies.txt");
    private static final String COOKIE_ENV = "YTDLP_COOKIES_B64";

    @Autowired
    private StringRedisTemplate redisTemplate;

    public YoutubeDownloadService() {
        writeCookiesIfPresent();
    }

    private void writeCookiesIfPresent() {
        try {
            String b64 = System.getenv(COOKIE_ENV);
            if (b64 == null || b64.isBlank()) return;

            byte[] decoded = Base64.getDecoder().decode(b64);
            Files.write(COOKIES_PATH, decoded, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            COOKIES_PATH.toFile().setReadable(true, true);

            System.out.println("Loaded YouTube cookies into /tmp/yt_cookies.txt");

        } catch (Exception e) {
            System.err.println("Failed to load cookies: " + e.getMessage());
        }
    }

    public void handleVideoRequest(String url, String format, String quality, HttpServletResponse response)
            throws IOException, InterruptedException {

        String normalizedFormat = normalizeFormat(format);
        String normalizedQuality = normalizeQuality(quality);
        String cacheKey = "video:" + url + ":" + normalizedFormat + ":" + normalizedQuality;
        String cachedPath = getCachedPath(cacheKey);

        if (cachedPath != null && Files.exists(Paths.get(cachedPath))) {
            streamFromFile(cachedPath, normalizedFormat, response);
            return;
        }

        String filePath = downloadVideo(url, normalizedFormat, normalizedQuality);
        putCachedPath(cacheKey, filePath);
        streamFromFile(filePath, normalizedFormat, response);
    }

    private String downloadVideo(String url, String format, String quality)
            throws IOException, InterruptedException {

        String videoId = UUID.randomUUID().toString();
        String outputFile = "/tmp/" + videoId + "." + format;

        String qualityArg = selectFormat(quality, format);
        List<String> command = buildCommand(url, format, qualityArg, quality, outputFile);
        runCommand(command);

        Path path = Paths.get(outputFile);
        if (!Files.exists(path)) throw new IOException("File not created by yt-dlp");

        return path.toAbsolutePath().toString();
    }

    private List<String> buildCommand(String url, String format, String qualityArg,
                                      String requestedAudioQuality, String outputFile) {
        List<String> args = new ArrayList<>();
        args.add(resolveYtDlpPath());
        args.add("--extractor-args");
        args.add("youtube:player_client=android");
        args.add("--no-check-certificates");
        args.add("--geo-bypass");

        if (Files.exists(COOKIES_PATH)) {
            args.add("--cookies");
            args.add(COOKIES_PATH.toString());
        }

        if (format.equals("mp3")) {
            String bitrate = mapBitrate(requestedAudioQuality);
            args.add("--extract-audio");
            args.add("--audio-format");
            args.add("mp3");
            args.add("--audio-quality");
            args.add(bitrate);
            args.add("-o");
            args.add(outputFile);
            args.add(url);
            return args;
        }

        args.add("-f");
        args.add(qualityArg + "+bestaudio/best");
        args.add("--merge-output-format");
        args.add("mp4");
        args.add("--remux-video");
        args.add("mp4");
        args.add("--ffmpeg-location");
        args.add(resolveFfmpegPath());
        args.add("-o");
        args.add(outputFile);
        args.add(url);
        return args;
    }

    private String mapBitrate(String q) {
        if (q == null) return "0";
        return switch (q.toLowerCase()) {
            case "320k" -> "320K";
            case "256k" -> "256K";
            case "192k" -> "192K";
            case "128k" -> "128K";
            case "64k" -> "64K";
            default -> "0";
        };
    }

    private String selectFormat(String quality, String format) {

        if (format.equals("mp3")) return "bestaudio";

        return switch (quality.toLowerCase(Locale.ROOT)) {
            case "144p" -> "bestvideo[height<=144][ext=mp4]";
            case "240p" -> "bestvideo[height<=240][ext=mp4]";
            case "360p" -> "bestvideo[height<=360][ext=mp4]";
            case "480p" -> "bestvideo[height<=480][ext=mp4]";
            case "720p" -> "bestvideo[height<=720][ext=mp4]";
            case "1080p" -> "bestvideo[height<=1080][ext=mp4]";
            case "1440p" -> "bestvideo[height<=1440][ext=mp4]";
            case "2160p", "4k" -> "bestvideo[height<=2160][ext=mp4]";
            default -> "bestvideo";
        };
    }

    private void runCommand(List<String> command) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(false);
        Process process = pb.start();

        ByteArrayOutputStream stderr = new ByteArrayOutputStream();

        Thread errThread = new Thread(() -> {
            try (InputStream es = process.getErrorStream()) {
                es.transferTo(stderr);
            } catch (IOException ignored) {}
        });

        errThread.start();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {

            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("yt-dlp: " + line);
            }
        }

        int exit = process.waitFor();
        errThread.join();

        if (exit != 0) {
            String err = stderr.toString();
            throw new RuntimeException("yt-dlp failed (exit " + exit + "): " + err);
        }
    }

    private String normalizeFormat(String format) {
        if (format == null) return "mp4";
        String normalized = format.toLowerCase(Locale.ROOT);
        return normalized.equals("mp3") ? "mp3" : "mp4";
    }

    private String normalizeQuality(String quality) {
        if (quality == null || quality.isBlank()) return "best";
        return quality;
    }

    private String getCachedPath(String cacheKey) {
        try {
            return redisTemplate.opsForValue().get(cacheKey);
        } catch (Exception e) {
            System.err.println("Redis read failed, continuing without cache: " + e.getMessage());
            return null;
        }
    }

    private void putCachedPath(String cacheKey, String filePath) {
        try {
            redisTemplate.opsForValue().set(cacheKey, filePath, CACHE_TTL_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            System.err.println("Redis write failed, continuing without cache: " + e.getMessage());
        }
    }

    private String resolveYtDlpPath() {
        return resolveBinary(YT_DLP_ENV, List.of(
                "/usr/local/bin/yt-dlp",
                "/opt/homebrew/bin/yt-dlp",
                "/usr/bin/yt-dlp"
        ), FALLBACK_YT_DLP);
    }

    private String resolveFfmpegPath() {
        return resolveBinary(FFMPEG_ENV, List.of(
                "/usr/bin/ffmpeg",
                "/usr/local/bin/ffmpeg",
                "/opt/homebrew/bin/ffmpeg"
        ), FALLBACK_FFMPEG);
    }

    private String resolveBinary(String envVar, List<String> candidates, String fallback) {
        String configured = System.getenv(envVar);
        if (configured != null && !configured.isBlank()) {
            return configured;
        }

        for (String candidate : candidates) {
            Path path = Paths.get(candidate);
            if (Files.isExecutable(path)) {
                return candidate;
            }
        }

        return fallback;
    }

    private void streamFromFile(String filePath, String format, HttpServletResponse response)
            throws IOException {

        File file = new File(filePath);
        if (!file.exists()) throw new IOException("Missing file: " + filePath);

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        response.setContentType(format.equals("mp3") ? "audio/mpeg" : "video/mp4");

        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + file.getName() + "\"");

        try (OutputStream out = response.getOutputStream()) {
            Files.copy(file.toPath(), out);
            out.flush();
        }
    }
}
