<<<<<<< HEAD
# MeTube – Full Stack YouTube Video Downloader  

A full-stack application built with **React + Tailwind CSS** and **Spring Boot** that allows users to **download and stream YouTube videos** in the highest available quality.  
It uses [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and `ffmpeg` under the hood to ensure reliable and high-quality downloads.

---

## 🚀 Features  

✅ Download any YouTube video in the **best available quality**  
✅ Simple and responsive UI built with **React + Tailwind CSS**  
✅ Auto-merges video and audio using `ffmpeg`  
✅ Streams the `.mp4` file directly to the client  
✅ Cleans up temporary files after response  
✅ Works even with the latest **YouTube SABR** restrictions  
✅ Fully compatible with **Ubuntu + JDK 23 (Valhalla EA)**  

---

## 🧠 How It Works  

When a user pastes a YouTube link and clicks **Download**:

1. The **React frontend** sends a request to the backend endpoint:  
   `/api/download?url=<YouTube_URL>`  
2. The **Spring Boot backend** runs a `yt-dlp` command that downloads the best-quality video and audio streams.  
3. `ffmpeg` merges both streams into a single `.mp4` file.  
4. The merged video is **streamed directly** to the browser.  
5. The backend **deletes temporary files** automatically after completion.  

---

## 🧩 Tech Stack  

| Component | Purpose |
|------------|----------|
| **React + Tailwind CSS** | Frontend built for a fast, mobile-friendly, and responsive UI where users can paste and download YouTube links easily. |
| **Spring Boot 3.5+** | Provides the REST API and handles download requests, process execution, and video streaming. |
| **yt-dlp** | A modern command-line downloader (fork of youtube-dl) used to fetch the best video and audio formats from YouTube. |
| **ffmpeg** | A multimedia tool that merges, converts, and processes media files. Here, it combines video and audio into one `.mp4`. |
| **Java 23 (Valhalla)** | Backend programming language used to build and run the Spring Boot service. |
| **Tomcat (Embedded)** | The web server inside Spring Boot that serves HTTP download requests. |

---

## Request Flow

[ User Interface (React + Tailwind) ]
           ↓
[ Spring Boot Backend ]
           ↓
[ yt-dlp + ffmpeg ]
           ↓
[ Streams .mp4 back to user ]

---

🧾 Summary

React + Tailwind CSS → Modern, responsive UI

Spring Boot → Handles API requests and video streaming

yt-dlp + ffmpeg → Fetch and merge YouTube content

Instant streaming → Video sent directly to browser

Temporary cleanup → No leftover files

--- 


## 🔮 Future Enhancements  

🚧 Planned improvements to make MeTube even better:  

- 🎵 **Audio-only downloads (MP3 format)**  
- 📺 **Support for entire playlist downloads**  
- ⚙️ **User-selectable video resolutions (480p, 720p, 1080p)**  
- 📱 **Progress bar and download status indicator in UI**  
- 💾 **Download history and caching for faster repeat downloads**  
- 🌐 **Deployable cloud version**  

---
## Author

Jay Chothiyawala 
=======
# metube
>>>>>>> 976cd966ab3a9b891afb69890af79d529b643b59
