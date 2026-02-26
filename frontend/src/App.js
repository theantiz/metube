import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const audioBitrates = ["320k", "256k", "192k", "128k", "64k"];
const videoQualities = ["best", "1080p", "720p", "480p", "360p"];

const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://metube-backend-fswb.onrender.com";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay },
  }),
};

function NavLink({ to, className, children }) {
  const handleClick = (e) => {
    e.preventDefault();
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

function Footer() {
  return (
    <footer className="text-xs sm:text-sm text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p>© {new Date().getFullYear()} MeTube. Ad-free.</p>
      <div className="flex items-center gap-4">
        <NavLink to="/privacy" className="footer-link">Privacy</NavLink>
        <NavLink to="/terms" className="footer-link">Terms</NavLink>
        <NavLink to="/feedback" className="footer-link">Feedback</NavLink>
      </div>
    </footer>
  );
}

function LegalPage({ title, children }) {
  return (
    <div className="min-h-screen bg-page px-5 py-8 sm:px-8 sm:py-10 flex items-center justify-center">
      <main className="relative z-10 w-full max-w-3xl mx-auto space-y-6">
        <motion.nav
          className="flex items-center justify-between"
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <NavLink to="/" className="text-white font-heading text-xl sm:text-2xl">MeTube</NavLink>
          <span className="nav-chip">Ad-free</span>
        </motion.nav>

        <motion.section
          className="glass-card p-6 sm:p-7 space-y-4 shadow-surface"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.05}
        >
          <h1 className="text-2xl sm:text-3xl font-heading text-white">{title}</h1>
          <p className="text-xs text-slate-400">Last updated: February 26, 2026</p>
          <div className="text-sm text-slate-200 leading-7 space-y-3">{children}</div>
        </motion.section>

        <Footer />
      </main>
    </div>
  );
}

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>MeTube only processes the URL you submit to fetch downloadable media. We do not require account signup.</p>
      <p>We may temporarily log technical metadata for reliability, abuse prevention, and debugging.</p>
      <p>Downloaded files are generated on-demand and may be cached briefly for performance.</p>
      <p>Do not submit private, illegal, or unauthorized content. You are responsible for your usage and local laws.</p>
      <p>For privacy requests, contact us via the Feedback page.</p>
    </LegalPage>
  );
}

function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>By using MeTube, you agree to use the service lawfully and respect platform and copyright rules.</p>
      <p>You may not abuse, overload, reverse engineer, or use the service for prohibited activity.</p>
      <p>Service availability is not guaranteed. Features can change at any time without notice.</p>
      <p>MeTube is provided as-is without warranties. You are responsible for the content you download.</p>
      <p>If you do not agree with these terms, do not use the service.</p>
    </LegalPage>
  );
}

function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    const subject = encodeURIComponent("MeTube Feedback");
    const body = encodeURIComponent(feedback.trim());
    window.location.href = `mailto:hello@metube.app?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <LegalPage title="Feedback">
      <p>We read all feedback. Share bugs, improvements, or feature requests.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write your feedback..."
          className="control-input min-h-[130px] resize-y"
        />
        <button type="submit" className="primary-button" disabled={!feedback.trim()}>
          Send Feedback
        </button>
      </form>
      {sent && <p className="status-text">Your mail app should open now. Thank you.</p>}
    </LegalPage>
  );
}

function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("best");

  useEffect(() => {
    setQuality(format === "mp3" ? audioBitrates[0] : "best");
  }, [format]);

  const cleanYouTubeUrl = (text) => {
    if (!text) return "";
    const match = text.match(
      /(https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s]+)/i
    );
    return match ? match[0] : text;
  };

  const qualityOptions = useMemo(
    () => (format === "mp3" ? audioBitrates : videoQualities),
    [format]
  );

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setMsg("Please enter a valid YouTube URL.");
      return;
    }

    setMsg("Preparing your file...");
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
        let errorMessage = "Download failed. Please retry.";
        try {
          const body = await response.json();
          if (body?.error) errorMessage = body.error;
        } catch (_e) {
          // ignore non-JSON responses
        }
        setMsg(errorMessage);
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
      setMsg("Service unavailable. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(cleanYouTubeUrl(text));
      setMsg("");
    } catch (_err) {
      setMsg("Clipboard access denied. Paste manually.");
    }
  };

  return (
    <div className="min-h-screen bg-page px-5 py-8 sm:px-8 sm:py-10 flex items-center justify-center">
      <main className="relative z-10 w-full max-w-4xl mx-auto space-y-8">
        <motion.nav
          className="flex items-center justify-between"
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <h1 className="text-white font-heading text-xl sm:text-2xl">MeTube</h1>
          <span className="nav-chip">Free to use</span>
        </motion.nav>

        <motion.header
          className="text-center space-y-3"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.04}
        >
          <h2 className="hero-heading">Download YouTube video or audio quickly.</h2>
          <p className="text-slate-300 text-base max-w-2xl mx-auto">
            Clean interface. No ads. No signup.
          </p>
        </motion.header>

        <motion.section
          className="glass-card p-5 sm:p-6 space-y-5 shadow-surface"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.08}
        >
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">YouTube URL</label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(cleanYouTubeUrl(e.target.value))}
                placeholder="https://youtube.com/watch?v=..."
                disabled={loading}
                className="control-input"
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="control-button paste-button"
              >
                Paste
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="control-select"
                disabled={loading}
              >
                <option value="mp4">MP4 Video</option>
                <option value="mp3">MP3 Audio</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="control-select"
                disabled={loading}
              >
                {qualityOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            className="primary-button"
            whileTap={{ scale: loading ? 1 : 0.985 }}
          >
            {loading ? "Downloading..." : "Download"}
          </motion.button>

          {msg && <p className="status-text">{msg}</p>}
        </motion.section>

        <Footer />
      </main>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  if (path === "/feedback") return <FeedbackPage />;
  return <HomePage />;
}
