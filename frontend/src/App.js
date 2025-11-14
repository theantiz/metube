import React, { useState } from "react";
import { motion } from "framer-motion";

const API_BASE = "https://metube-backend-fswb.onrender.com";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");


  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("best");

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setMsg("Please enter a valid YouTube URL.");
      return;
    }

    setMsg("⚙️ Download started...");
    setLoading(true);

    let fill = 0;
    const interval = setInterval(() => {
      fill += 20;
      if (fill >= 100) clearInterval(interval);
    }, 150);

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
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
      setMsg("✅ Download complete!");
    } catch (err) {
      console.error(err);
      setMsg("Something went wrong. Check the URL or server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setMsg("");
      }
    } catch (err) {
      console.error("Clipboard access denied:", err);
      setMsg("Clipboard access denied. Please paste manually.");
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* BG Orbs */}
      <motion.span className="orb orb-one" aria-hidden="true" />
      <motion.span className="orb orb-two" aria-hidden="true" />
      <motion.span className="orb orb-three" aria-hidden="true" />

      <motion.div
        className="relative z-10 w-full max-w-xl space-y-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="space-y-4 text-center sm:text-left sm:space-y-5">
          <span className="inline-flex items-center gap-2 badge mx-auto sm:mx-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Quick grab, zero fluff
          </span>

          <h1 className="text-4xl sm:text-5xl font-heading font-semibold tracking-tight leading-tight">
            Instantly download any YouTube video or audio.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto sm:mx-0">
            Paste your link, choose quality, and hit download.
          </p>
        </header>

        <motion.section
          className="glass-card p-6 sm:p-8 space-y-6 shadow-surface"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* URL Input */}
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
              YouTube Video Link
            </label>
            <div className="relative group">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your YouTube link..."
                disabled={loading}
                className="control-input"
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="control-button paste-button"
                title="Paste Link"
              >
                📋
              </button>
            </div>
          </div>

          {/* Format + Quality */}
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
            className="primary-button w-full mt-2 relative overflow-hidden"
          >
            {loading ? "Downloading..." : "Start Download"}
          </motion.button>

          {msg && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-200 mt-4"
            >
              {msg}
            </motion.p>
          )}
        </motion.section>

        <footer className="text-center text-xs text-slate-400">
          Crafted by <span className="font-semibold text-slate-100">antiz</span>
        </footer>
      </motion.div>
    </div>
  );
}
