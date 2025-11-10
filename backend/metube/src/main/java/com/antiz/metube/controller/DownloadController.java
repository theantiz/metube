package com.antiz.metube.controller;

import com.antiz.metube.service.YoutubeDownloadService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class DownloadController {

    @Autowired
    private YoutubeDownloadService youtubeDownloadService;

    @PostMapping("/stream")
    public void streamVideo(@RequestBody Map<String, String> body, HttpServletResponse response)
            throws IOException, InterruptedException {

        String url = body.get("url");
        System.out.println("🎬 Download requested: " + url);

        youtubeDownloadService.streamHighestQuality(url, response);
    }
}
