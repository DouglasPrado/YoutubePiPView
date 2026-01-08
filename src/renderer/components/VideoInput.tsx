import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useVideoId } from "../hooks/useVideoId";

interface VideoInputProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (videoId: string) => void;
  currentVideoId: string | null;
}

export function VideoInput({
  isVisible,
  onClose,
  onSubmit,
  currentVideoId,
}: VideoInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const extractVideoId = useVideoId();
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
      setInputValue("");
      setError(null);

      // Tentar colar automaticamente da área de transferência
      const pasteFromClipboard = async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            setInputValue(text);
          }
        } catch (err) {
          // Ignorar erro se não tiver permissão de clipboard
        }
      };
      pasteFromClipboard();

      // Auto-ocultar após 30 segundos sem interação
      autoHideTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 30000);
    } else {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      window.addEventListener("keydown", handleEscape as any);
      return () => {
        window.removeEventListener("keydown", handleEscape as any);
      };
    }
  }, [isVisible, onClose]);

  const handleSubmit = () => {
    console.log("handleSubmit chamado, inputValue:", inputValue);
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      setError("Por favor, insira uma URL ou ID do vídeo");
      inputRef.current?.focus();
      return;
    }

    const videoId = extractVideoId(trimmedValue);
    console.log("VideoId extraído:", videoId);

    if (!videoId) {
      setError(
        "URL ou ID do vídeo inválido. Use um link do YouTube ou um ID de 11 caracteres."
      );
      inputRef.current?.focus();
      return;
    }

    if (videoId === currentVideoId) {
      setError("Este vídeo já está sendo reproduzido");
      inputRef.current?.focus();
      return;
    }

    console.log("Chamando onSubmit com videoId:", videoId);
    setError(null);
    // Não fechar aqui, deixar o App.tsx gerenciar o fechamento
    onSubmit(videoId);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handlePaste = () => {
    // Limpar erro quando colar
    setError(null);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="video-input-overlay"
      onClick={(e) => {
        // Só fechar se clicar diretamente no overlay, não nos elementos filhos
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="video-input-container"
        onClick={(e) => e.stopPropagation()}
      >
        <label htmlFor="video-input" className="video-input-label">
          Cole a URL ou ID do vídeo do YouTube
        </label>
        <input
          id="video-input"
          ref={inputRef}
          type="text"
          className={`video-input-field ${error ? "error" : ""}`}
          placeholder="Cole a URL ou ID do vídeo..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
        />
        {error && <span className="video-input-error">{error}</span>}
        <div className="video-input-actions">
          <button
            className="video-input-button secondary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >
            Cancelar
          </button>
          <button
            className="video-input-button primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
