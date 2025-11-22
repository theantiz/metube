package com.antiz.metube.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class YoutubeDownloadService {

    private static final String YT_DLP_PATH = "/usr/local/bin/yt-dlp";
    private static final String FFMPEG_PATH = "/usr/bin/ffmpeg";
    private static final long CACHE_TTL_HOURS = 6;

    @Autowired
    private StringRedisTemplate redisTemplate;

    public void handleVideoRequest(String url, String format, String quality, HttpServletResponse response)
            throws IOException, InterruptedException {

        String cacheKey = "video:" + url + ":" + format + ":" + quality;
        String cachedPath = redisTemplate.opsForValue().get(cacheKey);

        if (cachedPath != null && Files.exists(Paths.get(cachedPath))) {
            streamFromFile(cachedPath, format, response);
            return;
        }

        String filePath = downloadVideo(url, format, quality);
        redisTemplate.opsForValue().set(cacheKey, filePath, CACHE_TTL_HOURS, TimeUnit.HOURS);
        streamFromFile(filePath, format, response);
    }

    private String downloadVideo(String url, String format, String quality)
            throws IOException, InterruptedException {

        String videoId = UUID.randomUUID().toString();
        String outputFile = "/tmp/" + videoId + "." + format;

        String qualityArg = selectFormat(quality, format);
        String command = buildCommand(url, format, qualityArg, quality, outputFile);

        runCommand(command);

        Path path = Paths.get(outputFile);
        if (!Files.exists(path)) throw new IOException("File not created by yt-dlp");

        return path.toAbsolutePath().toString();
    }

    private String buildCommand(String url, String format, String qualityArg, String requestedAudioQuality, String outputFile) {

        String jsRuntimeFix = "--extractor-args \"youtube:player_client=all\"";

        // audio-only (mp3)
        if (format.equals("mp3")) {
            String bitrate = mapBitrate(requestedAudioQuality);

            return String.format(
                    "%s %s --no-check-certificates --geo-bypass " +
                            "--extract-audio --audio-format mp3 --audio-quality %s " +
                            "-o \"%s\" \"%s\"",
                    YT_DLP_PATH, jsRuntimeFix, bitrate, outputFile, url
            );
        }

        // video (mp4)
        return String.format(
                "%s %s --no-check-certificates --geo-bypass " +
                        "-f \"%s+bestaudio/best\" --merge-output-format mp4 " +
                        "--remux-video mp4 --ffmpeg-location %s " +
                        "-o \"%s\" \"%s\"",
                YT_DLP_PATH, jsRuntimeFix, qualityArg, FFMPEG_PATH, outputFile, url
        );
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

        return switch (quality.toLowerCase()) {
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

    private void runCommand(String command) throws IOException, InterruptedException {

        ProcessBuilder pb = new ProcessBuilder("bash", "-c", command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {

            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("yt-dlp: " + line);
            }
        }

        if (process.waitFor() != 0) throw new RuntimeException("yt-dlp failed");
    }

    private void streamFromFile(String filePath, String format, HttpServletResponse response)
            throws IOException {

        File file = new File(filePath);
        if (!file.exists()) throw new IOException("File does not exist: " + filePath);

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
