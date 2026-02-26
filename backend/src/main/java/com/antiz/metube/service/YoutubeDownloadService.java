package com.antiz.metube.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
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
    private static final String PROXY_ENV = "YTDLP_PROXY";
    private static final String GEO_COUNTRY_ENV = "YTDLP_GEO_BYPASS_COUNTRY";
    private static final String FORCE_IPV4_ENV = "YTDLP_FORCE_IPV4";
    private static final long YTDLP_TIMEOUT_SECONDS = 180;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${app.redis.enabled:false}")
    private boolean redisEnabled;

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
        if (url == null || url.isBlank()) {
            throw new DownloadException("Missing YouTube URL", 400);
        }

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
        List<List<String>> commands = buildCommandVariants(url, format, qualityArg, quality, outputFile);

        String lastError = null;
        for (List<String> command : commands) {
            try {
                runCommand(command);
                lastError = null;
                break;
            } catch (RuntimeException ex) {
                lastError = ex.getMessage();
                // Some failures won't be fixed by trying another player client.
                if (isUnrecoverableFailure(lastError)) {
                    break;
                }
            }
        }

        if (lastError != null) {
            throw classifyFailure(lastError);
        }

        Path path = Paths.get(outputFile);
        if (!Files.exists(path)) throw new IOException("File not created by yt-dlp");

        return path.toAbsolutePath().toString();
    }

    private List<List<String>> buildCommandVariants(String url, String format, String qualityArg,
                                                    String requestedAudioQuality, String outputFile) {
        return List.of(
                buildCommand(url, format, qualityArg, requestedAudioQuality, outputFile, "android"),
                buildCommand(url, format, qualityArg, requestedAudioQuality, outputFile, "web")
        );
    }

    private List<String> buildCommand(String url, String format, String qualityArg,
                                      String requestedAudioQuality, String outputFile, String playerClient) {
        List<String> args = new ArrayList<>();
        args.add(resolveYtDlpPath());
        args.add("--extractor-args");
        args.add("youtube:player_client=" + playerClient);
        args.add("--no-check-certificates");
        args.add("--geo-bypass");
        args.add("--no-playlist");
        args.add("--no-warnings");
        args.add("--socket-timeout");
        args.add("20");
        args.add("--retries");
        args.add("2");
        args.add("--fragment-retries");
        args.add("2");

        String geoBypassCountry = envOrBlank(GEO_COUNTRY_ENV);
        if (!geoBypassCountry.isBlank()) {
            args.add("--geo-bypass-country");
            args.add(geoBypassCountry);
        }

        String proxy = envOrBlank(PROXY_ENV);
        if (!proxy.isBlank()) {
            args.add("--proxy");
            args.add(proxy);
        }

        if (Boolean.parseBoolean(envOrBlank(FORCE_IPV4_ENV))) {
            args.add("-4");
        }

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
            case "144p" -> "bestvideo[height<=144]";
            case "240p" -> "bestvideo[height<=240]";
            case "360p" -> "bestvideo[height<=360]";
            case "480p" -> "bestvideo[height<=480]";
            case "720p" -> "bestvideo[height<=720]";
            case "1080p" -> "bestvideo[height<=1080]";
            case "1440p" -> "bestvideo[height<=1440]";
            case "2160p", "4k" -> "bestvideo[height<=2160]";
            default -> "bestvideo";
        };
    }

    private void runCommand(List<String> command) throws InterruptedException {
        Process process;
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(false);
            process = pb.start();
        } catch (IOException e) {
            String message = e.getMessage() == null ? "" : e.getMessage();
            if (message.contains("Cannot run program")) {
                throw new DownloadException(
                        "yt-dlp is not installed on server. Install yt-dlp or set YT_DLP_PATH.",
                        500
                );
            }
            throw new DownloadException("Failed to start yt-dlp process.", 500);
        }

        ByteArrayOutputStream stderr = new ByteArrayOutputStream();

        Thread errThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.err.println("yt-dlp err: " + line);
                    stderr.write((line + System.lineSeparator()).getBytes(StandardCharsets.UTF_8));
                }
            } catch (IOException ignored) {}
        });

        errThread.start();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {

            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("yt-dlp: " + line);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        boolean finished = process.waitFor(YTDLP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            errThread.join();
            throw new DownloadException(
                    "yt-dlp timed out on server. Try another video, lower quality, or retry shortly.",
                    504
            );
        }

        int exit = process.exitValue();
        errThread.join();

        if (exit != 0) {
            String err = stderr.toString();
            throw new RuntimeException("yt-dlp failed (exit " + exit + "): " + err);
        }
    }

    private RuntimeException classifyFailure(String msg) {
        String lower = msg.toLowerCase(Locale.ROOT);

        if (lower.contains("sign in to confirm you’re not a bot")
                || lower.contains("sign in to confirm you're not a bot")
                || lower.contains("--cookies-from-browser")
                || lower.contains("use --cookies")) {
            String hint = envOrBlank(COOKIE_ENV).isBlank()
                    ? " Set YTDLP_COOKIES_B64 with exported YouTube cookies."
                    : " Verify YTDLP_COOKIES_B64 contains fresh, valid YouTube cookies.";
            if (envOrBlank(PROXY_ENV).isBlank()) {
                hint += " You may also need a residential proxy via YTDLP_PROXY.";
            }
            return new DownloadException("YouTube bot verification blocked this request." + hint, 422);
        }

        if (lower.contains("not made this video available in your country")
                || lower.contains("this video is available in")) {
            String proxyHint = envOrBlank(PROXY_ENV).isBlank()
                    ? " Set YTDLP_PROXY to a proxy in an allowed country."
                    : "";
            return new DownloadException("Video is geo-restricted for server region." + proxyHint, 422);
        }

        if (lower.contains("private video") || lower.contains("sign in to confirm your age")) {
            return new DownloadException("This video requires authentication/cookies to download.", 422);
        }

        if (lower.contains("requested format is not available")) {
            return new DownloadException("Requested quality/format is unavailable for this video. Try Best or lower quality.", 422);
        }

        if (lower.contains("video unavailable")
                || lower.contains("this video is unavailable")
                || lower.contains("copyright")
                || lower.contains("removed by the uploader")) {
            return new DownloadException("This video is unavailable for download.", 422);
        }

        if (lower.contains("unsupported url")) {
            return new DownloadException("Unsupported or invalid YouTube URL.", 400);
        }

        if (lower.contains("timed out")
                || lower.contains("temporary failure in name resolution")
                || lower.contains("unable to download webpage")
                || lower.contains("http error 5")
                || lower.contains("too many requests")) {
            return new DownloadException("YouTube is temporarily unreachable from server. Please retry in a minute.", 502);
        }

        return new DownloadException("Download failed. Please try a different video or quality.", 502);
    }

    private boolean isUnrecoverableFailure(String msg) {
        String lower = msg == null ? "" : msg.toLowerCase(Locale.ROOT);
        return lower.contains("sign in to confirm you’re not a bot")
                || lower.contains("sign in to confirm you're not a bot")
                || lower.contains("use --cookies")
                || lower.contains("private video")
                || lower.contains("unsupported url")
                || lower.contains("not made this video available in your country");
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
        if (!redisEnabled || redisTemplate == null) {
            return null;
        }
        try {
            return redisTemplate.opsForValue().get(cacheKey);
        } catch (Exception e) {
            System.err.println("Redis read failed, continuing without cache: " + e.getMessage());
            return null;
        }
    }

    private void putCachedPath(String cacheKey, String filePath) {
        if (!redisEnabled || redisTemplate == null) {
            return;
        }
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

    private String envOrBlank(String name) {
        String value = System.getenv(name);
        return value == null ? "" : value.trim();
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
