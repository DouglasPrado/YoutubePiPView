export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface StoredData {
  lastVideoId?: string;
  windowSize?: WindowSize;
  windowPosition?: WindowPosition;
}
