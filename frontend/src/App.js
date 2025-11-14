import React, { useState } from "react";
import { motion } from "framer-motion";

// Connected to Render backend
const API_BASE = "https://metube-backend-fswb.onrender.com";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("best");

  // Clean pasted YouTube links
  const cleanYouTubeUrl = (text) => {
    if (!text) return "";
    const match = text.match(
      /(https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s]+)/i
    );
    return match ? match[0] : text;
  };

  const handleDownload = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      setMsg("Please enter a valid YouTube URL.");
      return;
    }

    setMsg("Download started...");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/stream?format=${format}&quality=${quality}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        setMsg("Download failed. Please try again.");
        setLoading(false);
        return;
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = format === "mp3" ? "audio.mp3" : "video.mp4";
      a.click();

      window.URL.revokeObjectURL(blobUrl);
      setMsg("Download complete.");
    } catch (err) {
      console.error(err);
      setMsg("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = cleanYouTubeUrl(text);
      setUrl(cleaned);
      setMsg("");
    } catch (err) {
      setMsg("Clipboard access denied. Please paste manually.");
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6 py-12 relative overflow-hidden">

      <motion.span className="orb orb-one" />
      <motion.span className="orb orb-two" />
      <motion.span className="orb orb-three" />

      <motion.div
        className="relative z-10 w-full max-w-xl space-y-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <header className="space-y-4 text-center sm:text-left">
          <span className="badge flex items-center gap-2 mx-auto sm:mx-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Quick grab, zero fluff
          </span>

          <h1 className="text-4xl sm:text-5xl font-heading font-semibold">
            Instantly download any YouTube video or audio.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto sm:mx-0">
            Paste your link, choose the quality, and download.
          </p>


        </header>

        {/* Download Box */}
        <motion.section
          className="glass-card p-6 sm:p-8 space-y-6 shadow-surface"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* URL */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
              YouTube Video Link
            </label>

            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(cleanYouTubeUrl(e.target.value))}
                placeholder="Paste your YouTube link..."
                disabled={loading}
                className="control-input"
              />

              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="control-button paste-button"
                title="Paste"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Format & Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="control-select"
                disabled={loading}
              >
                <option value="mp4">MP4 (Video)</option>
                <option value="mp3">MP3 (Audio)</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
                Quality
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="control-select"
                disabled={loading}
              >
                <option value="best">Best</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>
          </div>

          {/* Download Button */}
          <motion.button
            type="button"
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            className="primary-button w-full mt-2"
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? "Downloading..." : "Start Download"}
          </motion.button>

          {msg && (
            <p className="text-center text-slate-200 font-medium">{msg}</p>
          )}
        </motion.section>

        <footer className="text-center text-xs text-slate-400">
          Crafted by{" "}
          <a
            href="https://antiz.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 hover:text-emerald-400 transition-colors"
          >
            antiz
          </a>{" "}
          - YouTube Video Downloader
        </footer>
      </motion.div>
    </div>
  );
}
