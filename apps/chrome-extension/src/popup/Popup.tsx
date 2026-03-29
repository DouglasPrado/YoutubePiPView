import { useState, useEffect } from "react";
import { extractVideoId } from "@ytview/youtube-utils";

const DESKTOP_API = "http://localhost:8765";

export function Popup() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "opening" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        const id = extractVideoId(tab.url);
        setVideoId(id);
      }
      setLoading(false);
    });
  }, []);

  const handleOpenPip = async () => {
    if (!videoId) return;

    setStatus("opening");
    setErrorMsg(null);

    try {
      const response = await fetch(`${DESKTOP_API}/api/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) throw new Error("Failed");
      setStatus("success");
      setTimeout(() => window.close(), 800);
    } catch {
      // Desktop not running — launch it via ytview:// protocol
      window.open(`ytview://play?v=${videoId}`);
      setStatus("success");
      setErrorMsg("Abrindo YTView Desktop...");
      setTimeout(() => window.close(), 1500);
    }
  };

  if (loading) {
    return (
      <div className="popup">
        <h1 className="popup-title">YouTube PiP View</h1>
        <p className="popup-loading">Detectando vídeo...</p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="popup">
        <h1 className="popup-title">YouTube PiP View</h1>
        <div className="popup-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Navegue até um vídeo do YouTube para usar o PiP</p>
        </div>
      </div>
    );
  }

  return (
    <div className="popup">
      <h1 className="popup-title">YouTube PiP View</h1>

      <div className="popup-preview">
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt="Video thumbnail"
          className="popup-thumbnail"
        />
        <button
          onClick={handleOpenPip}
          disabled={status === "opening" || status === "success"}
          className={`popup-button pip-button ${status !== "idle" ? `pip-${status}` : ""}`}
        >
          {status === "idle" && "Abrir PIP"}
          {status === "opening" && "Abrindo..."}
          {status === "success" && "Aberto!"}
          {status === "error" && "Tentar novamente"}
        </button>
        {errorMsg && <p className="popup-error">{errorMsg}</p>}
      </div>
    </div>
  );
}
