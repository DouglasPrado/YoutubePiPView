import { useEffect, useRef, useState } from "react";
import { Play, Trash2, X } from "lucide-react";
import { useVideoId } from "../hooks/useVideoId";
import type { QueueItem, QueueState } from "../../types";
import "../styles/queue.css";

export function QueueApp() {
  const [queue, setQueue] = useState<QueueState>({ items: [], currentIndex: -1 });
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const extractVideoId = useVideoId();

  // Load initial queue state
  useEffect(() => {
    if (!window.electronAPI?.getQueue) return;
    window.electronAPI.getQueue().then((state) => {
      if (state) setQueue(state);
    });
  }, []);

  // Listen for queue updates from main process
  useEffect(() => {
    if (!window.electronAPI?.onQueueUpdated) return;
    const cleanup = window.electronAPI.onQueueUpdated((state: QueueState) => {
      setQueue(state);
    });
    return cleanup;
  }, []);

  const handleAddVideos = async () => {
    const text = inputValue.trim();
    if (!text) {
      setError("Cole URLs do YouTube para adicionar à fila");
      return;
    }

    const lines = text.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
    const parsedItems: Array<{ videoId: string; url: string }> = [];
    const invalidLines: string[] = [];

    for (const line of lines) {
      const videoId = extractVideoId(line);
      if (videoId) {
        parsedItems.push({ videoId, url: line });
      } else {
        invalidLines.push(line);
      }
    }

    if (parsedItems.length === 0) {
      setError("Nenhuma URL válida do YouTube encontrada");
      return;
    }

    setError(null);
    setIsAdding(true);
    try {
      if (window.electronAPI?.addToQueue) {
        await window.electronAPI.addToQueue(parsedItems);
        setInputValue("");
      } else if (window.electronAPI?.setQueue) {
        const fallbackItems: QueueItem[] = parsedItems.map((item) => ({
          id: `${item.videoId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          videoId: item.videoId,
          url: item.url,
          title: item.videoId,
        }));
        await window.electronAPI.setQueue([...queue.items, ...fallbackItems]);
        setInputValue("");
      }
    } finally {
      setIsAdding(false);
    }

    if (invalidLines.length > 0) {
      setError(`${parsedItems.length} adicionado(s). ${invalidLines.length} URL(s) inválida(s) ignorada(s).`);
    }
  };

  const handleRemove = (id: string) => {
    if (window.electronAPI?.removeFromQueue) {
      window.electronAPI.removeFromQueue(id);
    }
  };

  const handleClear = () => {
    if (window.electronAPI?.clearQueue) {
      window.electronAPI.clearQueue();
    }
  };

  const handlePlay = (index: number) => {
    if (window.electronAPI?.playFromQueue) {
      window.electronAPI.playFromQueue(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleAddVideos();
    }
  };

  return (
    <div className="queue-app">
      <div className="queue-header">
        <h1>Playlist</h1>
        <span className="queue-count">{queue.items.length} vídeo(s)</span>
      </div>

      <div className="queue-input-section">
        <textarea
          ref={textareaRef}
          className="queue-textarea"
          placeholder={"Cole URLs do YouTube aqui (uma por linha)...\nEx: https://youtube.com/watch?v=..."}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          rows={4}
        />
        {error && <span className="queue-error">{error}</span>}
        <button className="queue-add-button" onClick={handleAddVideos} disabled={isAdding}>
          {isAdding ? "Adicionando..." : "Adicionar à fila"}
        </button>
      </div>

      <div className="queue-list">
        {queue.items.length === 0 ? (
          <div className="queue-empty">
            <p>Nenhum vídeo na fila</p>
            <p className="queue-empty-hint">Cole URLs acima para começar</p>
          </div>
        ) : (
          queue.items.map((item, index) => (
            <div
              key={item.id}
              className={`queue-item ${index === queue.currentIndex ? "active" : ""}`}
            >
              <div className="queue-item-index">{index + 1}</div>
              <img
                className="queue-item-thumb"
                src={`https://img.youtube.com/vi/${item.videoId}/default.jpg`}
                alt=""
              />
              <div className="queue-item-info">
                <span className="queue-item-id" title={item.title || item.videoId}>
                  {item.title || item.videoId}
                </span>
                <span className="queue-item-url" title={item.url}>
                  {item.url.length > 45 ? item.url.slice(0, 45) + "..." : item.url}
                </span>
              </div>
              <div className="queue-item-actions">
                <button
                  className="queue-item-play"
                  onClick={() => handlePlay(index)}
                  title="Reproduzir"
                >
                  <Play size={14} />
                </button>
                <button
                  className="queue-item-remove"
                  onClick={() => handleRemove(item.id)}
                  title="Remover"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {queue.items.length > 0 && (
        <div className="queue-footer">
          <button className="queue-clear-button" onClick={handleClear}>
            <Trash2 size={14} />
            Limpar fila
          </button>
          {queue.currentIndex === -1 && queue.items.length > 0 && (
            <button className="queue-play-all-button" onClick={() => handlePlay(0)}>
              <Play size={14} />
              Reproduzir tudo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
