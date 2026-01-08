const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    getStoredVideo: () => ipcRenderer.invoke('get-stored-video'),
    saveVideo: (videoId) => ipcRenderer.invoke('save-video', videoId),
    getWindowSize: () => ipcRenderer.invoke('get-window-size'),
    saveWindowSize: (size) => ipcRenderer.invoke('save-window-size', size)
  });
} catch (error) {
  console.error('[PRELOAD] Error exposing electronAPI:', error);
  throw error;
}
