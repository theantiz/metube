import React, { useState } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setMsg("Please enter a valid YouTube URL.");
      return;
    }
    setMsg("");
    setLoading(true);

    try {
      const response = await fetch("/api/stream", {
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
      const urlObject = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObject;
      a.download = "video.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObject);

      setMsg("Your download has started ✔️");
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
      console.error("Failed to read clipboard:", err);
      setMsg("Clipboard access denied. Please paste manually.");
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background floating orbs */}
      <motion.span
        className="orb orb-one"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.1 }}
      />
      <motion.span
        className="orb orb-two"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.75, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.span
        className="orb orb-three"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.6 }}
      />

      {/* Main container */}
      <motion.div
        className="relative z-10 w-full max-w-xl space-y-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header Section */}
        <motion.header
          className="space-y-4 text-center sm:text-left sm:space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 badge mx-auto sm:mx-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Quick grab, zero fluff
          </span>

          <h1 className="text-4xl sm:text-5xl font-heading font-semibold tracking-tight leading-tight text-balance">
            Instantly download any YouTube video no clutter attached.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto sm:mx-0 font-body">
            Paste your link, hit download, and you’re done. It’s that simple.
          </p>
        </motion.header>

        {/* Download Section */}
        <motion.section
          className="glass-card p-6 sm:p-8 space-y-6 shadow-surface"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.55 }}
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

              {/* Paste button */}
              <button
              
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="control-button paste-button"
              >
                Paste Link
              </button>
            </div>
          </div>

          {/* Download Button */}
          <motion.button
            type="button"
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            className="primary-button"
            whileTap={{ scale: loading || !url.trim() ? 1 : 0.98 }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3 text-sm font-semibold tracking-wide">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-30"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-80"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Downloading...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3 text-sm font-semibold tracking-wide">
                <span className="shimmer-dot" aria-hidden="true" />
                Start Download
              </span>
            )}
            <span className="button-sheen" aria-hidden="true" />
          </motion.button>

          {/* Status Message */}
          {msg && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`status-chip ${
                msg.includes("✔️")
                  ? "status-chip--success"
                  : msg.includes("failed")
                  ? "status-chip--error"
                  : "status-chip--info"
              }`}
            >
              {msg}
            </motion.p>
          )}
        </motion.section>

        {/* Footer */}
        <motion.footer
          className="text-center sm:text-left text-xs sm:text-sm text-slate-400 font-body"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          Crafted by <span className="text-slate-100 font-semibold">antiz</span> · Stay in flow.
        </motion.footer>
      </motion.div>
    </div>
  );
}
