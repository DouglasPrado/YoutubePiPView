import React, { useState, useEffect } from "react";
import { extractVideoId } from "@ytview/youtube-utils";
import { getStoredVideoId, saveVideoId } from "../utils/storage";

export function Popup() {
  const [input, setInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStoredVideoId().then((id) => {
      if (id) {
        setVideoId(id);
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const id = extractVideoId(input);
    if (id) {
      setVideoId(id);
      saveVideoId(id);
      setInput("");
    } else {
      setError("Invalid YouTube URL or video ID");
    }
  };

  const handlePiP = () => {
    if (videoId) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "OPEN_PIP",
            videoId,
          });
        }
      });
    }
  };

  return (
    <div className="popup">
      <h1 className="popup-title">YouTube PiP View</h1>

      <form onSubmit={handleSubmit} className="popup-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YouTube URL or video ID"
          className="popup-input"
        />
        <button type="submit" className="popup-button">
          Load
        </button>
      </form>

      {error && <p className="popup-error">{error}</p>}

      {videoId && (
        <div className="popup-preview">
          <img
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt="Video thumbnail"
            className="popup-thumbnail"
          />
          <div className="popup-actions">
            <button onClick={handlePiP} className="popup-button pip-button">
              Open PiP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
