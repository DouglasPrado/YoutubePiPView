import { useEffect, useState } from "react";
import { VideoControls } from "./components/VideoControls";
import { VideoInput } from "./components/VideoInput";
import { YouTubePlayer } from "./components/YouTubePlayer";
import "./styles/app.css";

type AppState = "idle" | "edit" | "loading";

export function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [appState, setAppState] = useState<AppState>("idle");
  const [player, setPlayer] = useState<any>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Carregar último vídeo salvo ao iniciar
    const loadStoredVideo = async () => {
      try {
        if (!window.electronAPI) {
          console.error("electronAPI não está disponível");
          setShowInput(true);
          setAppState("edit");
          return;
        }
        const storedVideoId = await window.electronAPI.getStoredVideo();
        if (storedVideoId) {
          setVideoId(storedVideoId);
          setAppState("idle");
        } else {
          // Se não houver vídeo salvo, mostrar o input automaticamente
          setShowInput(true);
          setAppState("edit");
        }
      } catch (error) {
        console.error("Erro ao carregar vídeo salvo:", error);
        // Em caso de erro, mostrar o input
        setShowInput(true);
        setAppState("edit");
      }
    };

    loadStoredVideo();
  }, []);

  const handlePlayerClick = () => {
    setShowInput(true);
    setAppState("edit");
  };

  const handleInputClose = () => {
    setShowInput(false);
    if (appState === "edit") {
      setAppState("idle");
    }
  };

  const handleVideoSubmit = async (newVideoId: string) => {
    console.log("handleVideoSubmit chamado com:", newVideoId);

    if (newVideoId === videoId) {
      console.log("Vídeo já está sendo reproduzido");
      setShowInput(false);
      return;
    }

    console.log("Fechando input e iniciando loading...");
    // Fechar o input imediatamente
    setShowInput(false);
    setAppState("loading");

    try {
      console.log("Salvando vídeo...");
      if (!window.electronAPI) {
        throw new Error("electronAPI não está disponível");
      }
      // Salvar vídeo
      await window.electronAPI.saveVideo(newVideoId);
      console.log("Vídeo salvo, atualizando videoId para:", newVideoId);

      // Atualizar o videoId - isso vai fazer o player renderizar o novo vídeo
      setVideoId(newVideoId);

      // Pequeno delay para mostrar o loading e permitir que o iframe carregue
      setTimeout(() => {
        console.log("Mudando estado para idle");
        setAppState("idle");
      }, 500);
    } catch (error) {
      console.error("Erro ao salvar vídeo:", error);
      setAppState("idle");
      // Mostrar input novamente em caso de erro
      setShowInput(true);
      setAppState("edit");
    }
  };

  const isLoading = appState === "loading";

  const handlePlayerReady = (playerInstance: any) => {
    setPlayer(playerInstance);
  };

  // Controlar visibilidade dos controles com hover na janela toda
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout | null = null;

    const handleMouseMove = () => {
      setShowControls(true);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      hideTimeout = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    };

    // Adicionar listener no documento para capturar movimento em toda a janela
    document.addEventListener("mousemove", handleMouseMove, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, []);

  return (
    <div
      className="app-container"
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Overlay invisível para capturar eventos de mouse em toda a janela */}
      <div
        className="mouse-detector-overlay"
        onMouseMove={() => setShowControls(true)}
      />
      <YouTubePlayer
        videoId={videoId}
        onPlayerClick={handlePlayerClick}
        isLoading={isLoading}
        onPlayerReady={handlePlayerReady}
        showControls={showControls}
      />
      {isLoading && <div className="loading-spinner" />}
      {videoId && (
        <VideoControls
          player={player}
          videoId={videoId}
          showControls={showControls}
        />
      )}
      <VideoInput
        isVisible={showInput}
        onClose={handleInputClose}
        onSubmit={handleVideoSubmit}
        currentVideoId={videoId}
      />
    </div>
  );
}
