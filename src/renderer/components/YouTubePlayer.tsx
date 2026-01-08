import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string | null;
  onPlayerClick: () => void;
  isLoading: boolean;
  onPlayerReady?: (player: any) => void;
}

export function YouTubePlayer({
  videoId,
  onPlayerClick,
  isLoading,
  onPlayerReady,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  console.log("[YouTubePlayer] Renderizando com videoId:", videoId);

  // Atualizar iframe quando videoId mudar
  useEffect(() => {
    if (iframeRef.current && videoId) {
      const currentOrigin = window.location.origin || "http://localhost:8765";
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(
        currentOrigin
      )}`;
      iframeRef.current.src = embedUrl;
    }
  }, [videoId]);

  // Criar player simples para controles básicos via postMessage
  useEffect(() => {
    if (!videoId || !onPlayerReady) return;

    const timer = setTimeout(() => {
      if (iframeRef.current) {
        const player = {
          play: () => {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "playVideo",
                  args: "",
                }),
                "https://www.youtube.com"
              );
            }
          },
          pause: () => {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "pauseVideo",
                  args: "",
                }),
                "https://www.youtube.com"
              );
            }
          },
          seekTo: (seconds: number) => {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "seekTo",
                  args: [seconds, true],
                }),
                "https://www.youtube.com"
              );
            }
          },
          onProgress: (
            _callback: (currentTime: number, duration: number) => void
          ) => {
            // Retornar função vazia para compatibilidade
            return () => {};
          },
          requestProgress: () => {
            // Função vazia para compatibilidade
          },
        };
        onPlayerReady(player);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [videoId, onPlayerReady]);

  // Agora podemos fazer o return condicional
  if (!videoId) {
    return (
      <div
        className="youtube-player-container"
        ref={containerRef}
        onClick={onPlayerClick}
        style={{ cursor: "pointer" }}
      >
        <div className="empty-state">
          <div className="empty-state-icon">▶</div>
          <div className="empty-state-text">Adicione uma URL do YouTube</div>
        </div>
      </div>
    );
  }

  // URL do embed com API habilitada para controles básicos
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin || "http://localhost:8765"
      : "http://localhost:8765";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(
    currentOrigin
  )}`;

  return (
    <div
      className={`youtube-player-container ${isLoading ? "loading" : ""}`}
      ref={containerRef}
    >
      <iframe
        ref={iframeRef}
        className="youtube-iframe-element"
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        title="YouTube video player"
      />
      <div
        className="change-video-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPlayerClick();
        }}
        title="Trocar vídeo"
      >
        ↻
      </div>
      <div
        className="open-youtube-button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const youtubeUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : "https://www.youtube.com";
          console.log("Abrindo URL:", youtubeUrl);
          if (window.electronAPI) {
            try {
              await window.electronAPI.openExternalUrl(youtubeUrl);
              console.log("URL aberta com sucesso");
            } catch (error) {
              console.error("Erro ao abrir URL:", error);
            }
          } else {
            console.error("electronAPI não está disponível");
          }
        }}
        title="Abrir no YouTube"
      >
        <ExternalLink size={18} />
      </div>
      <div
        className="close-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.electronAPI) {
            window.electronAPI.closeWindow();
          }
        }}
        title="Fechar"
      >
        <X size={18} />
      </div>
    </div>
  );
}
