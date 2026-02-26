import React, { useEffect, useMemo, useState } from "react";

const audioBitrates = ["320k", "256k", "192k", "128k", "64k"];
const videoQualities = ["best", "1080p", "720p", "480p", "360p"];

const API_BASE = "https://metube-backend-fswb.onrender.com";

const featureCards = [
  {
    title: "Always Free",
    copy: "No payment gates. Just paste, choose quality, and download instantly.",
  },
  {
    title: "High Quality",
    copy: "MP4 and MP3 outputs with quality presets and fast conversion flow.",
  },
  {
    title: "Clean UX",
    copy: "Mobile-ready layout with focused actions and zero noisy UI.",
  },
  {
    title: "Reliable Backend",
    copy: "Spring + yt-dlp pipeline with cache support and resilient execution.",
  },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("best");

  useEffect(() => {
    if (format === "mp3") {
      setQuality(audioBitrates[0]);
    } else {
      setQuality("best");
    }
  }, [format]);

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mx", `${x}%`);
      document.documentElement.style.setProperty("--my", `${y}%`);
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

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
        setMsg("Download failed. Please retry.");
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
    } catch (err) {
      setMsg("Clipboard access denied. Paste manually.");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden px-5 py-7 sm:px-8 sm:py-10 bg-page">
      <div className="spotlight-layer" />
      <span className="orb orb-one" />
      <span className="orb orb-two" />
      <span className="orb orb-three" />

      <main className="relative z-10 w-full max-w-6xl mx-auto space-y-10 sm:space-y-14">
        <nav className="flex items-center justify-between">
          <div className="text-white font-heading text-xl sm:text-2xl">MeTube</div>
          <span className="nav-chip">Free to use</span>
        </nav>

        <section className="grid lg:grid-cols-[1.2fr_1fr] gap-7 lg:gap-8 items-start">
          <div className="space-y-5">
            <span className="badge inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Polished frontend experience
            </span>

            <h1 className="hero-heading">
              Download YouTube videos with a clean, modern interface.
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Built for speed, clarity, and visual impact. Free access, no
              plan lock, and a UI crafted to feel production-grade.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <span className="pill">No Paywall</span>
              <span className="pill">Fast Downloads</span>
              <span className="pill">Mobile Ready</span>
              <span className="pill">Hiring-grade UI</span>
            </div>
          </div>

          <section className="glass-card shadow-surface p-6 sm:p-7 space-y-5">
            <div className="space-y-2.5">
              <label className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">
                YouTube URL
              </label>

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

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">
                  Format
                </label>
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
                <label className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">
                  Quality
                </label>
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

            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !url.trim()}
              className="primary-button"
            >
              {loading ? "Downloading..." : "Download Now"}
            </button>

            {msg && <p className="status-text">{msg}</p>}
          </section>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {featureCards.map((item) => (
            <article
              key={item.title}
              className="glass-card p-5"
            >
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {item.copy}
              </p>
            </article>
          ))}
        </section>

        <footer className="text-xs sm:text-sm text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <p>© {new Date().getFullYear()} MeTube. Free forever.</p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-slate-100">Privacy</a>
            <a href="/terms" className="hover:text-slate-100">Terms</a>
            <a href="mailto:hello@metube.app" className="hover:text-slate-100">
              Contact
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
