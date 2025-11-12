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
            System.out.println("⚡ Serving from Redis cache: " + cachedPath);
            streamFromFile(cachedPath, format, response);
            return;
        }

        System.out.println("⬇️ Downloading new file for " + url);
        String filePath = downloadAndSave(url, format, quality);

        redisTemplate.opsForValue().set(cacheKey, filePath, CACHE_TTL_HOURS, TimeUnit.HOURS);
        System.out.println("✅ Cached: " + cacheKey);

        streamFromFile(filePath, format, response);
    }

    public String downloadAndSave(String url, String format, String quality)
            throws IOException, InterruptedException {

        String videoId = UUID.randomUUID().toString();
        String outputFile = videoId + "." + format;
        String cmd;

        if (format.equals("mp3")) {
            // 🎧 Audio-only extraction
            cmd = String.format(
                    "%s --no-check-certificates --geo-bypass --extract-audio " +
                            "--audio-format mp3 --audio-quality 0 " +
                            "-o \"%s\" \"%s\"",
                    YT_DLP_PATH, outputFile, url
            );

        } else {
            // 🎥 High-quality video (supports 4K, HDR, AV1, etc.)
            String qualityArg = getBestVideoFormat(quality);
            cmd = String.format(
                    "%s --no-check-certificates --geo-bypass --concurrent-fragments 5 " +
                            "-f \"%s+bestaudio/best\" --merge-output-format mp4 " +
                            "--remux-video mp4 --ffmpeg-location %s " +
                            "-o \"%s\" \"%s\"",
                    YT_DLP_PATH, qualityArg, FFMPEG_PATH, outputFile, url
            );
        }

        System.out.println("▶ Running: " + cmd);

        ProcessBuilder pb = new ProcessBuilder("bash", "-c", cmd);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("yt-dlp ▶ " + line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) throw new RuntimeException("❌ yt-dlp failed with code: " + exitCode);

        Path path = Paths.get(outputFile);
        if (!Files.exists(path)) throw new IOException("❌ File missing after download.");

        System.out.println("✅ Download complete: " + path.toAbsolutePath());
        return path.toAbsolutePath().toString();
    }

    // 🎯 Smart quality selection
    private String getBestVideoFormat(String quality) {
        switch (quality.toLowerCase()) {
            case "144p": return "bestvideo[height<=144][ext=mp4]";
            case "240p": return "bestvideo[height<=240][ext=mp4]";
            case "360p": return "bestvideo[height<=360][ext=mp4]";
            case "480p": return "bestvideo[height<=480][ext=mp4]";
            case "720p": return "bestvideo[height<=720][ext=mp4]";
            case "1080p": return "bestvideo[height<=1080][ext=mp4]";
            case "1440p": return "bestvideo[height<=1440][ext=mp4]";
            case "2160p":
            case "4k": return "bestvideo[height<=2160][ext=mp4]/bestvideo[height<=2160][ext=webm]";
            case "best":
            default: return "bestvideo+bestaudio/best";
        }
    }

    private void streamFromFile(String filePath, String format, HttpServletResponse response) throws IOException {
        File file = new File(filePath);
        if (!file.exists()) {
            System.out.println("❌ Cached file not found: " + filePath);
            throw new IOException("File not found: " + filePath);
        }

        response.setContentType(format.equals("mp3") ? "audio/mpeg" : "video/mp4");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + (format.equals("mp3") ? "audio.mp3" : "video.mp4") + "\"");
        response.setStatus(HttpServletResponse.SC_OK);

        try (OutputStream out = response.getOutputStream()) {
            Files.copy(file.toPath(), out);
            out.flush();
        }

        System.out.println("✅ Streamed successfully: " + filePath);
    }
}
