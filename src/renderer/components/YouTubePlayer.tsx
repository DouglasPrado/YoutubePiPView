import { ExternalLink, Minus, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string | null;
  onPlayerClick: () => void;
  isLoading: boolean;
  onPlayerReady?: (player: any) => void;
  showControls?: boolean;
}

export function YouTubePlayer({
  videoId,
  onPlayerClick,
  isLoading,
  onPlayerReady,
  showControls = false,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const videoStateRef = useRef<{
    videoStartTime: number;
    lastKnownTime: number;
    isPaused: boolean;
    estimatedDuration: number;
  }>({
    videoStartTime: Date.now(),
    lastKnownTime: 0,
    isPaused: false,
    estimatedDuration: 0,
  });

  console.log("[YouTubePlayer] Renderizando com videoId:", videoId);

  // Atualizar iframe quando videoId mudar
  useEffect(() => {
    if (iframeRef.current && videoId) {
      const currentOrigin = window.location.origin || "http://localhost:8765";
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=0&fs=0&enablejsapi=1&origin=${encodeURIComponent(
        currentOrigin
      )}&iv_load_policy=3&disablekb=1&cc_load_policy=0`;
      iframeRef.current.src = embedUrl;
      // Resetar estado quando mudar o vídeo
      videoStateRef.current = {
        videoStartTime: Date.now(),
        lastKnownTime: 0,
        isPaused: false,
        estimatedDuration: 0,
      };
    }
  }, [videoId]);

  // Criar player com tracking de progresso via mensagens do YouTube
  useEffect(() => {
    if (!videoId || !onPlayerReady) return;

    // Callbacks para atualizar progresso
    let progressCallbacks: Array<
      (currentTime: number, duration: number) => void
    > = [];
    const state = videoStateRef.current;

    // Listener global para mensagens do YouTube
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // Capturar estado do vídeo
        if (data?.event === "onStateChange") {
          if (data.info === 1) {
            // Playing
            state.isPaused = false;
            state.videoStartTime = Date.now() - state.lastKnownTime * 1000;
          } else if (data.info === 2) {
            // Paused
            state.isPaused = true;
          }
        }

        // Capturar informações de progresso
        if (data?.info?.currentTime !== undefined) {
          state.lastKnownTime = data.info.currentTime;
          if (data?.info?.duration !== undefined) {
            state.estimatedDuration = data.info.duration;
            progressCallbacks.forEach((cb) =>
              cb(data.info.currentTime, data.info.duration)
            );
          } else if (state.estimatedDuration > 0) {
            progressCallbacks.forEach((cb) =>
              cb(data.info.currentTime, state.estimatedDuration)
            );
          }
        }

        // Capturar duração do vídeo
        if (data?.info?.videoData?.length_seconds) {
          state.estimatedDuration = parseFloat(
            data.info.videoData.length_seconds
          );
          if (state.lastKnownTime > 0) {
            progressCallbacks.forEach((cb) =>
              cb(state.lastKnownTime, state.estimatedDuration)
            );
          }
        }

        // Capturar informações de vídeo carregado
        if (data?.info?.videoData) {
          const videoData = data.info.videoData;
          if (videoData.length_seconds) {
            state.estimatedDuration = parseFloat(videoData.length_seconds);
            // Notificar callbacks imediatamente quando obtemos a duração
            if (state.lastKnownTime > 0) {
              progressCallbacks.forEach((cb) =>
                cb(state.lastKnownTime, state.estimatedDuration)
              );
            } else {
              // Se ainda não temos tempo, notificar com 0
              progressCallbacks.forEach((cb) => cb(0, state.estimatedDuration));
            }
          }
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    };

    window.addEventListener("message", messageHandler);

    // Sistema de atualização de progresso baseado em estimativa
    let progressInterval: NodeJS.Timeout | null = null;

    const startProgressEstimation = () => {
      if (progressInterval) return;

      progressInterval = setInterval(() => {
        if (!state.isPaused && state.estimatedDuration > 0) {
          const elapsed = (Date.now() - state.videoStartTime) / 1000;
          if (elapsed <= state.estimatedDuration && elapsed >= 0) {
            state.lastKnownTime = elapsed;
            progressCallbacks.forEach((cb) =>
              cb(elapsed, state.estimatedDuration)
            );
          }
        }
      }, 500);
    };

    // Aguardar um pouco para o iframe carregar
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        const player = {
          play: () => {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              state.isPaused = false;
              state.videoStartTime = Date.now() - state.lastKnownTime * 1000;
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "playVideo",
                  args: "",
                }),
                "https://www.youtube.com"
              );
            }
            startProgressEstimation();
          },
          pause: () => {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              state.isPaused = true;
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
              state.lastKnownTime = seconds;
              state.videoStartTime = Date.now() - seconds * 1000;
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "seekTo",
                  args: [seconds, true],
                }),
                "https://www.youtube.com"
              );
              // Atualizar callbacks imediatamente
              if (state.estimatedDuration > 0) {
                progressCallbacks.forEach((cb) =>
                  cb(seconds, state.estimatedDuration)
                );
              }
            }
          },
          onProgress: (
            callback: (currentTime: number, duration: number) => void
          ) => {
            progressCallbacks.push(callback);
            // Se já temos duração, notificar imediatamente
            if (state.estimatedDuration > 0) {
              callback(state.lastKnownTime, state.estimatedDuration);
            }
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
              // Também solicitar estado atual
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  event: "listening",
                  id: iframeRef.current?.id || "widget",
                }),
                "https://www.youtube.com"
              );
            }
          },
          getIframe: () => iframeRef.current,
          getCurrentTime: () => {
            // Retornar o tempo atual estimado
            const state = videoStateRef.current;
            if (!state.isPaused && state.estimatedDuration > 0) {
              const elapsed = (Date.now() - state.videoStartTime) / 1000;
              return Math.min(elapsed, state.estimatedDuration);
            }
            return state.lastKnownTime;
          },
        };
        playerRef.current = player;
        onPlayerReady(player);
        startProgressEstimation();
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (progressInterval) clearInterval(progressInterval);
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

  // URL do embed com API habilitada para controles básicos
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin || "http://localhost:8765"
      : "http://localhost:8765";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=0&fs=0&enablejsapi=1&origin=${encodeURIComponent(
    currentOrigin
  )}&iv_load_policy=3&disablekb=1&cc_load_policy=0`;

  return (
    <div
      className={`youtube-player-container ${isLoading ? "loading" : ""} ${
        showControls ? "show-controls" : ""
      }`}
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
          let youtubeUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : "https://www.youtube.com";

          // Adicionar tempo atual se disponível
          if (videoId && playerRef.current?.getCurrentTime) {
            const currentTime = Math.floor(playerRef.current.getCurrentTime());
            if (currentTime > 0) {
              youtubeUrl += `&t=${currentTime}s`;
            }
          }

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
        className="minimize-button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Pausar o vídeo antes de minimizar
          if (playerRef.current?.pause) {
            playerRef.current.pause();
          }

          if (window.electronAPI) {
            try {
              await window.electronAPI.minimizeWindow();
            } catch (error) {
              console.error("Erro ao minimizar:", error);
            }
          }
        }}
        title="Minimizar (pausar e tornar transparente)"
      >
        <Minus size={18} />
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
