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

  // IMPORTANTE: Todos os hooks devem ser chamados antes de qualquer return condicional
  // Atualizar iframe quando videoId mudar
  useEffect(() => {
    if (iframeRef.current && videoId) {
      // Para evitar erro 153, usar origem válida
      // No Electron, usar a origem atual ou localhost
      const currentOrigin = window.location.origin || "http://localhost:8765";
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=1&fs=1&enablejsapi=1&origin=${encodeURIComponent(
        currentOrigin
      )}`;
      iframeRef.current.src = embedUrl;
    }
  }, [videoId]);

  // Expor função para controlar o player via postMessage
  useEffect(() => {
    if (!videoId || !onPlayerReady) return;

    // Callbacks para atualizar progresso (fora do setTimeout para persistir)
    let progressCallbacks: Array<
      (currentTime: number, duration: number) => void
    > = [];

    // Listener global para mensagens do YouTube
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // YouTube envia informações de progresso em alguns eventos
        if (
          data?.info?.currentTime !== undefined &&
          data?.info?.duration !== undefined
        ) {
          progressCallbacks.forEach((cb) =>
            cb(data.info.currentTime, data.info.duration)
          );
        }
        // Também pode vir em formato diferente
        if (data?.info?.videoData?.length_seconds) {
          const duration = parseFloat(data.info.videoData.length_seconds);
          if (data?.info?.currentTime !== undefined) {
            progressCallbacks.forEach((cb) =>
              cb(data.info.currentTime, duration)
            );
          }
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    };

    window.addEventListener("message", messageHandler);

    // Aguardar um pouco para o iframe carregar
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
            callback: (currentTime: number, duration: number) => void
          ) => {
            progressCallbacks.push(callback);
            return () => {
              progressCallbacks = progressCallbacks.filter(
                (cb) => cb !== callback
              );
            };
          },
          requestProgress: () => {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              // Solicitar informações do vídeo
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "getVideoData",
                  args: "",
                }),
                "https://www.youtube.com"
              );
            }
          },
          getIframe: () => iframeRef.current,
        };
        onPlayerReady(player);
      }
    }, 1000); // Aguardar 1 segundo para o iframe carregar

    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", messageHandler);
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

  // Construir URL do embed com origin para evitar erro 153
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin || "http://localhost:8765"
      : "http://localhost:8765";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=1&fs=1&enablejsapi=1&origin=${encodeURIComponent(
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
        allowFullScreen
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
    </div>
  );
}
