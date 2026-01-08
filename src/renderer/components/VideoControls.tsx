import { useRef, useState, useEffect } from 'react';

interface VideoControlsProps {
  player: any;
  videoId: string | null;
}

export function VideoControls({ player, videoId }: VideoControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(true); // Assumir que está tocando inicialmente (autoplay)
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  if (!videoId) {
    return null;
  }

  // Verificar se a API de PiP está disponível
  const isPiPSupported = 'pictureInPictureEnabled' in document;

  // Monitorar mudanças no estado de PiP
  useEffect(() => {
    if (!isPiPSupported) return;

    const handlePiPChange = () => {
      setIsPiPActive(!!document.pictureInPictureElement);
    };

    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, [isPiPSupported]);

  // Atualizar progresso do vídeo usando listener de mensagens do YouTube
  useEffect(() => {
    if (!player || !videoId || isSeeking) return;

    let cleanup: (() => void) | undefined;

    if (player?.onProgress) {
      cleanup = player.onProgress((time: number, dur: number) => {
        if (!isSeeking && time !== undefined && dur !== undefined) {
          if (dur > 0) setDuration(dur);
          if (time >= 0) setCurrentTime(time);
        }
      });
    }

    // Solicitar progresso periodicamente
    const requestProgress = () => {
      if (player?.requestProgress) {
        player.requestProgress();
      }
    };

    const interval = setInterval(requestProgress, 1000);

    return () => {
      if (cleanup) cleanup();
      clearInterval(interval);
    };
  }, [player, videoId, isSeeking]);

  // Tentar encontrar elemento video dentro do iframe do YouTube
  // Nota: Isso pode não funcionar devido a restrições de cross-origin
  const tryNativePiP = async () => {
    if (!isPiPSupported) {
      console.log('API de Picture-in-Picture não é suportada');
      return;
    }

    try {
      // Tentar encontrar um elemento video (pode não funcionar com iframe do YouTube)
      const video = document.querySelector('video');

      if (video && video.readyState >= 2) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } else {
        console.log('Elemento video não encontrado ou não está pronto');
        // A API nativa de PiP não funciona com iframes do YouTube
        // A janela Electron já está configurada como PiP
      }
    } catch (error) {
      console.error('Erro ao ativar PiP nativo:', error);
      // A janela Electron já funciona como PiP
    }
  };

  const togglePlayPause = () => {
    const iframe = document.querySelector('.youtube-iframe-element') as HTMLIFrameElement;

    if (isPlaying) {
      // Pausar
      if (player?.pause) {
        player.pause();
      } else if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
          'https://www.youtube.com'
        );
      }
      setIsPlaying(false);
    } else {
      // Play
      if (player?.play) {
        player.play();
      } else if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
          'https://www.youtube.com'
        );
      }
      setIsPlaying(true);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    setIsSeeking(true);
    // Atualizar visualmente enquanto arrasta
    if (duration > 0) {
      const seekTime = (percentage / 100) * duration;
      setCurrentTime(seekTime);
    }
  };

  const handleProgressMouseUp = () => {
    if (player?.seekTo && duration > 0 && progressRef.current) {
      const percentage = parseFloat(progressRef.current.value);
      const seekTime = (percentage / 100) * duration;
      player.seekTo(seekTime);
      setCurrentTime(seekTime);
    }
    setIsSeeking(false);
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={controlsRef} className="video-controls-container">
      <div className="video-progress-container">
        <span className="video-time">{formatTime(currentTime)}</span>
        <input
          ref={progressRef}
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progressPercentage}
          onChange={handleProgressChange}
          onMouseUp={handleProgressMouseUp}
          onTouchEnd={handleProgressMouseUp}
          className="video-progress-slider"
          title="Arraste para buscar no vídeo"
        />
        <span className="video-time">{formatTime(duration)}</span>
      </div>
      <div className="video-controls-floating">
        <button
          className="control-button play-pause-button"
          onClick={togglePlayPause}
          title={isPlaying ? "Pausar" : "Play"}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        {isPiPSupported && (
          <button
            className="control-button pip-button"
            onClick={tryNativePiP}
            title={isPiPActive ? "Sair do PiP" : "Ativar PiP nativo"}
          >
            {isPiPActive ? '⛶' : '⊞'}
          </button>
        )}
      </div>
    </div>
  );
}
