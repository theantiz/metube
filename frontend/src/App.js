import React, { useState } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState(0);

  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("best");

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setMsg("Please enter a valid YouTube URL.");
      return;
    }

    setMsg("⚙️ Download started...");
    setProgress(0);
    setLoading(true);
    // optional: skip connecting SSE
    // const evtSource = startProgressListener(url, format, quality);
    let fill = 0;
    const interval = setInterval(() => {
      fill += 20;
      setProgress(fill);
      if (fill >= 100) clearInterval(interval);
    }, 150);

    try {
      const response = await fetch(`/api/stream?format=${format}&quality=${quality}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

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
      {/* Background Orbs */}
      <motion.span className="orb orb-one" aria-hidden="true" />
      <motion.span className="orb orb-two" aria-hidden="true" />
      <motion.span className="orb orb-three" aria-hidden="true" />

      {/* Main Container */}
      <motion.div
        className="relative z-10 w-full max-w-xl space-y-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <header className="space-y-4 text-center sm:text-left sm:space-y-5">
          <span className="inline-flex items-center gap-2 badge mx-auto sm:mx-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Quick grab, zero fluff
          </span>
          <h1 className="text-4xl sm:text-5xl font-heading font-semibold tracking-tight leading-tight text-balance">
            Instantly download any YouTube video or audio.
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto sm:mx-0 font-body">
            Paste your link, choose quality, and hit download.
          </p>
        </header>

        {/* Download Section */}
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
                placeholder="Paste your YouTube link here..."
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
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Format & Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="control-select"
                disabled={loading}
              >
                <option value="mp4">Video (MP4)</option>
                <option value="mp3">Audio (MP3)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
                Quality
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="control-select"
                disabled={loading}
              >
                <option value="best">Best Available</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
              <p className="text-xs text-slate-400 mt-1 leading-tight">
                For video downloads, select "Best Available" for optimal quality.
              </p>
            </div>
          </div>



          {/* Download Button */}
          <motion.button
            type="button"
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            className="primary-button w-full mt-2 relative overflow-hidden"
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? "Downloading..." : "Start Download"}
            {loading && !progress && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.button>



          {/* Status Message */}
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <motion.p
                className={`status-chip ${
                  msg.includes("✅")
                    ? "status-chip--success"
                    : msg.includes("failed")
                    ? "status-chip--error"
                    : "status-chip--info"
                }`}
                animate={msg.includes("✅") ? {
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    "0 25px 40px rgba(236, 72, 153, 0.35)",
                    "0 30px 50px rgba(236, 72, 153, 0.5)",
                    "0 25px 40px rgba(236, 72, 153, 0.35)"
                  ]
                } : {}}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {msg}
              </motion.p>
            </motion.div>
          )}
        </motion.section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 font-body">
          Crafted by <span className="text-slate-100 font-semibold">antiz</span> · Stay in flow.
        </footer>
      </motion.div>
    </div>
  );
}
