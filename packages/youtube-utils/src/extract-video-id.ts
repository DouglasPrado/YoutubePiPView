/**
 * Extracts a YouTube video ID from a URL or direct ID string.
 * Supports formats:
 * - Direct 11-character video ID
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/embed/ID
 */
export function extractVideoId(input: string): string | null {
  if (!input || input.trim() === "") {
    return null;
  }

  const trimmed = input.trim();

  // Check if it's a direct ID (11 alphanumeric characters)
  const directIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (directIdPattern.test(trimmed)) {
    return trimmed;
  }

  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
