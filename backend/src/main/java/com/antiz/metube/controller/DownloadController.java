package com.antiz.metube.controller;

import com.antiz.metube.service.YoutubeDownloadService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
@CrossOrigin
@RestController
@RequestMapping("/api")
public class DownloadController {

    @Autowired
    private YoutubeDownloadService youtubeDownloadService;

    @RequestMapping(value = "/stream", method = RequestMethod.OPTIONS)
    public void handleOptions(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.setStatus(200);
    }

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
