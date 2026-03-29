// YouTube IFrame Player API Types

export interface PlayerState {
  UNSTARTED: -1;
  ENDED: 0;
  PLAYING: 1;
  PAUSED: 2;
  BUFFERING: 3;
  CUED: 5;
}

export interface PlayerEvent {
  target: YTPlayer;
  data: unknown;
}

export interface VideoData {
  video_id: string;
  author: string;
  title: string;
}

export interface PlayerVars {
  autoplay?: 0 | 1;
  cc_lang_pref?: string;
  cc_load_policy?: 0 | 1;
  color?: "red" | "white";
  controls?: 0 | 1 | 2;
  disablekb?: 0 | 1;
  enablejsapi?: 0 | 1;
  end?: number;
  fs?: 0 | 1;
  hl?: string;
  iv_load_policy?: 1 | 3;
  list?: string;
  listType?: "playlist" | "search" | "user_uploads";
  loop?: 0 | 1;
  modestbranding?: 0 | 1;
  origin?: string;
  playlist?: string;
  playsinline?: 0 | 1;
  rel?: 0 | 1;
  start?: number;
}

export interface PlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: PlayerVars;
  events?: {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
    onPlaybackQualityChange?: (event: PlayerEvent) => void;
    onPlaybackRateChange?: (event: PlayerEvent) => void;
    onError?: (event: PlayerEvent) => void;
    onApiChange?: (event: PlayerEvent) => void;
  };
}

export interface YTPlayer {
  destroy(): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  cueVideoById(videoId: string, startSeconds?: number): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getVideoLoadedFraction(): number;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoUrl(): string;
  getVideoEmbedCode(): string;
  getVideoData(): VideoData;
  getAvailablePlaybackRates(): number[];
  setPlaybackRate(suggestedRate: number): void;
  getAvailableQualityLevels(): string[];
  setPlaybackQuality(suggestedQuality: string): void;
  getIframe(): HTMLIFrameElement;
  addEventListener(
    event: string,
    listener: (event: PlayerEvent) => void
  ): void;
  removeEventListener(
    event: string,
    listener: (event: PlayerEvent) => void
  ): void;
}
