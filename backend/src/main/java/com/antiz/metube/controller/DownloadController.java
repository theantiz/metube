package com.antiz.metube.controller;

import com.antiz.metube.service.YoutubeDownloadService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DownloadController {

    @Autowired
    private YoutubeDownloadService youtubeDownloadService;

    @PostMapping("/stream")
    public void streamVideo(
            @RequestBody Map<String, String> body,
            @RequestParam(defaultValue = "mp4") String format,
            @RequestParam(defaultValue = "best") String quality,
            HttpServletResponse response
    ) throws IOException, InterruptedException {

        String url = body.get("url");
        youtubeDownloadService.handleVideoRequest(url, format, quality, response);
    }
}
