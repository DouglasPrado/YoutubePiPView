import { contextBridge, ipcRenderer } from 'electron';

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
  closeWindow: () => ipcRenderer.invoke('close-window')
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
    };
  }
}
