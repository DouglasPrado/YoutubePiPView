export function useVideoId(): (input: string) => string | null {
  return (input: string): string | null => {
    if (!input || input.trim() === '') {
      return null;
    }

    const trimmed = input.trim();

    // Verificar se é um ID direto (11 caracteres alfanuméricos)
    const directIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    if (directIdPattern.test(trimmed)) {
      return trimmed;
    }

    // Padrões de URL do YouTube
    const patterns = [
      // youtube.com/watch?v=ID
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/embed/ID
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      // youtu.be/ID
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };
}
