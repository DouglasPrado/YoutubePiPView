import { extractVideoId } from "@ytview/youtube-utils";

export function useVideoId(): (input: string) => string | null {
  return extractVideoId;
}
