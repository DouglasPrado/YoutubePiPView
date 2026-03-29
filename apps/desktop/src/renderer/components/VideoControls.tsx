import { useEffect, useRef, useState } from "react";

interface VideoControlsProps {
  player: any;
  videoId: string | null;
  showControls?: boolean;
}

export function VideoControls({
  player,
  videoId,
  showControls = false,
}: VideoControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const lastKnownTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(true); // Assumir que está tocando inicialmente (autoplay)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  if (!videoId) {
    return null;
  }

  // Atualizar progresso do vídeo usando listener de mensagens do YouTube
  useEffect(() => {
    if (!player || !videoId) return;

    let cleanup: (() => void) | undefined;

    if (player?.onProgress) {
      cleanup = player.onProgress((time: number, dur: number) => {
        if (time !== undefined && dur !== undefined) {
          // Sempre atualizar duração quando disponível
          if (dur > 0) {
            setDuration(dur);
          }
          // Atualizar tempo atual apenas se não estiver arrastando
          if (!isSeeking && time >= 0) {
            setCurrentTime(time);
            lastKnownTimeRef.current = time;
            lastUpdateTimeRef.current = Date.now();
          }
        }
      });
    }

    // Solicitar progresso periodicamente
    const requestProgress = () => {
      if (player?.requestProgress) {
        player.requestProgress();
      }
    };

    // Sistema de atualização contínua baseado em estimativa
    const updateProgress = () => {
      if (!isSeeking && isPlaying) {
        const now = Date.now();
        const elapsed = (now - lastUpdateTimeRef.current) / 1000;
        const newTime = lastKnownTimeRef.current + elapsed;

        // Atualizar apenas se temos duração ou se ainda não chegamos no limite
        if (duration > 0) {
          if (newTime <= duration) {
            setCurrentTime(newTime);
          } else {
            setCurrentTime(duration);
          }
        } else {
          // Sem duração, apenas incrementar
          setCurrentTime(newTime);
        }
      }
    };

    const requestInterval = setInterval(requestProgress, 2000);
    const updateInterval = setInterval(updateProgress, 500);

    return () => {
      if (cleanup) cleanup();
      clearInterval(requestInterval);
      clearInterval(updateInterval);
    };
  }, [player, videoId, isSeeking, isPlaying, duration]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Se não tiver duração, usar uma estimativa padrão para permitir arrastar
  const effectiveDuration = duration > 0 ? duration : 600; // 10 minutos padrão
  const progressPercentage =
    effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  const togglePlayPause = () => {
    const iframe = document.querySelector(
      ".youtube-iframe-element"
    ) as HTMLIFrameElement;

    if (isPlaying) {
      // Pausar
      if (player?.pause) {
        player.pause();
      } else if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: "" }),
          "https://www.youtube.com"
        );
      }
      setIsPlaying(false);
    } else {
      // Play
      if (player?.play) {
        player.play();
      } else if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: "" }),
          "https://www.youtube.com"
        );
      }
      setIsPlaying(true);
      // Resetar tempo de atualização quando começar a tocar
      // O sistema de atualização vai continuar a partir do currentTime atual
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    setIsSeeking(true);
    // Atualizar visualmente enquanto arrasta
    const seekTime = (percentage / 100) * effectiveDuration;
    setCurrentTime(seekTime);
  };

  const handleProgressMouseDown = () => {
    setIsSeeking(true);
  };

  const handleProgressMouseUp = () => {
    if (player?.seekTo && progressRef.current) {
      const percentage = parseFloat(progressRef.current.value);
      const seekTime = (percentage / 100) * effectiveDuration;
      player.seekTo(seekTime);
      setCurrentTime(seekTime);
      lastKnownTimeRef.current = seekTime;
      lastUpdateTimeRef.current = Date.now();
    }
    setIsSeeking(false);
  };

  const handleProgressTouchEnd = () => {
    if (player?.seekTo && progressRef.current) {
      const percentage = parseFloat(progressRef.current.value);
      const seekTime = (percentage / 100) * effectiveDuration;
      player.seekTo(seekTime);
      setCurrentTime(seekTime);
      lastKnownTimeRef.current = seekTime;
      lastUpdateTimeRef.current = Date.now();
    }
    setIsSeeking(false);
  };

  // Usar o estado compartilhado de visibilidade
  useEffect(() => {
    setIsVisible(showControls);
  }, [showControls]);

  return (
    <div ref={containerRef} className="video-controls-wrapper">
      <div
        ref={controlsRef}
        className={`video-controls-container ${
          isVisible ? "visible" : "hidden"
        }`}
      >
        <div className="video-progress-container">
          <button
            className="control-button-small play-pause-button"
            onClick={togglePlayPause}
            title={isPlaying ? "Pausar" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <span className="video-time">{formatTime(currentTime)}</span>
          <input
            ref={progressRef}
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercentage}
            onChange={handleProgressChange}
            onMouseDown={handleProgressMouseDown}
            onMouseUp={handleProgressMouseUp}
            onTouchStart={handleProgressMouseDown}
            onTouchEnd={handleProgressTouchEnd}
            className="video-progress-slider"
            title="Arraste para buscar no vídeo"
          />
          <span className="video-time">{formatTime(effectiveDuration)}</span>
        </div>
      </div>
    </div>
  );
}
