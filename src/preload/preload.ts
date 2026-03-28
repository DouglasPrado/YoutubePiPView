import { contextBridge, ipcRenderer } from 'electron';
import type { QueueItem, QueueState } from '../types';

contextBridge.exposeInMainWorld('electronAPI', {
  getStoredVideo: () => ipcRenderer.invoke('get-stored-video'),
  saveVideo: (videoId: string) => ipcRenderer.invoke('save-video', videoId),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  saveWindowSize: (size: { width: number; height: number }) =>
    ipcRenderer.invoke('save-window-size', size),
  moveWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send('window-move', { deltaX, deltaY });
  },
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  // Queue/Playlist
  openQueueWindow: () => ipcRenderer.invoke('open-queue-window'),
  getQueue: () => ipcRenderer.invoke('get-queue'),
  setQueue: (items: QueueItem[]) => ipcRenderer.invoke('set-queue', items),
  removeFromQueue: (id: string) => ipcRenderer.invoke('remove-from-queue', id),
  clearQueue: () => ipcRenderer.invoke('clear-queue'),
  playFromQueue: (index: number) => ipcRenderer.invoke('play-from-queue', index),
  notifyVideoEnded: () => ipcRenderer.invoke('video-ended'),
  onPlayVideo: (callback: (videoId: string) => void) => {
    const handler = (_event: any, videoId: string) => callback(videoId);
    ipcRenderer.on('play-video', handler);
    return () => { ipcRenderer.removeListener('play-video', handler); };
  },
  onQueueUpdated: (callback: (state: QueueState) => void) => {
    const handler = (_event: any, state: QueueState) => callback(state);
    ipcRenderer.on('queue-updated', handler);
    return () => { ipcRenderer.removeListener('queue-updated', handler); };
  },
});

declare global {
  interface Window {
    electronAPI: {
      getStoredVideo: () => Promise<string | null>;
      saveVideo: (videoId: string) => Promise<void>;
      getWindowSize: () => Promise<{ width: number; height: number } | null>;
      saveWindowSize: (size: { width: number; height: number }) => Promise<void>;
      moveWindow: (deltaX: number, deltaY: number) => void;
      openExternalUrl: (url: string) => Promise<void>;
      minimizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      // Queue/Playlist
      openQueueWindow: () => Promise<void>;
      getQueue: () => Promise<QueueState>;
      setQueue: (items: QueueItem[]) => Promise<void>;
      removeFromQueue: (id: string) => Promise<void>;
      clearQueue: () => Promise<void>;
      playFromQueue: (index: number) => Promise<void>;
      notifyVideoEnded: () => Promise<void>;
      onPlayVideo: (callback: (videoId: string) => void) => () => void;
      onQueueUpdated: (callback: (state: QueueState) => void) => () => void;
    };
  }
}
