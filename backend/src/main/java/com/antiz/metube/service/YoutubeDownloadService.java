package com.antiz.metube.service;

import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletResponse;

import java.io.*;
import java.nio.file.*;
import java.util.UUID;

@Service
public class YoutubeDownloadService {

    private static final String YT_DLP_PATH = "/usr/local/bin/yt-dlp";
    private static final String FFMPEG_PATH = "/usr/bin/ffmpeg";

    public void streamHighestQuality(String url, HttpServletResponse response) {
        String videoId = UUID.randomUUID().toString();
        String outputFile = videoId + ".mp4";

        try {
            System.out.println("🎬 Download requested: " + url);


            String cmd = String.format(
                    "%s --no-check-certificates --geo-bypass --concurrent-fragments 5 " +
                            "--extractor-args \"youtube:player_client=android\" " +
                            "-f \"bestvideo+bestaudio/best\" --merge-output-format mp4 " +
                            "-o \"%s\" \"%s\"",
                    YT_DLP_PATH, outputFile, url
            );

            System.out.println("Running command:\n" + cmd);

            // ✅ Run yt-dlp
            ProcessBuilder pb = new ProcessBuilder("bash", "-c", cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();


            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("yt-dlp ▶ " + line);
                }
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("❌ yt-dlp failed with exit code: " + exitCode);
            }


            Path path = Paths.get(outputFile);
            if (!Files.exists(path) || Files.size(path) < 1000) {
                throw new RuntimeException("❌ Downloaded file is empty or missing: " + path.toAbsolutePath());
            }

            System.out.println("✅ Download completed: " + path.toAbsolutePath());


            response.setContentType("video/mp4");
            response.setHeader("Content-Disposition", "attachment; filename=\"video.mp4\"");
            response.setStatus(HttpServletResponse.SC_OK);

            try (OutputStream out = response.getOutputStream()) {
                Files.copy(path, out);
                out.flush();
            }

            System.out.println(" Video streamed successfully to client!");

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Video download or stream failed: " + e.getMessage());
        } finally {
            // ✅ Cleanup
            try {
                Files.deleteIfExists(Paths.get(outputFile));
                System.out.println("Temporary file cleaned up.");
            } catch (IOException ignored) {
            }
        }
    }
}
