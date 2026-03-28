import { Volume2, Volume1, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VideoControlsProps {
  player: any;
  videoId: string | null;
  showControls?: boolean;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

export function VideoControls({
  player,
  videoId,
  showControls = false,
  volume = 100,
  onVolumeChange,
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
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(volume);

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
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Usar duração real para a barra de progresso; fallback apenas para permitir arrastar
  const effectiveDuration = duration > 0 ? duration : 600;
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

  const handleMuteToggle = () => {
    if (isMuted) {
      // Unmute: restaurar volume anterior
      setIsMuted(false);
      if (player?.unMute) player.unMute();
      if (onVolumeChange) onVolumeChange(previousVolumeRef.current || 100);
    } else {
      // Mute: salvar volume atual e mutar
      previousVolumeRef.current = volume;
      setIsMuted(true);
      if (player?.mute) player.mute();
      if (onVolumeChange) onVolumeChange(0);
    }
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      previousVolumeRef.current = newVolume;
      if (player?.unMute) player.unMute();
    }
    if (onVolumeChange) onVolumeChange(newVolume);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume <= 50 ? Volume1 : Volume2;

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
          <div className="volume-control">
            <button
              className="control-button-small volume-button"
              onClick={handleMuteToggle}
              title={isMuted ? "Ativar som" : "Mutar"}
            >
              <VolumeIcon size={14} />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeSliderChange}
              className="volume-slider"
              title="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
