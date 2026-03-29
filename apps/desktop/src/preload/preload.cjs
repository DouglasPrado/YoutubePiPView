const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    getStoredVideo: () => ipcRenderer.invoke('get-stored-video'),
    saveVideo: (videoId) => ipcRenderer.invoke('save-video', videoId),
    getStoredVolume: () => ipcRenderer.invoke('get-stored-volume'),
    saveVolume: (volume) => ipcRenderer.invoke('save-volume', volume),
    getWindowSize: () => ipcRenderer.invoke('get-window-size'),
    saveWindowSize: (size) => ipcRenderer.invoke('save-window-size', size),
    moveWindow: (deltaX, deltaY) => {
      ipcRenderer.send('window-move', { deltaX, deltaY });
    },
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    // Queue/Playlist
    openQueueWindow: () => ipcRenderer.invoke('open-queue-window'),
    getQueue: () => ipcRenderer.invoke('get-queue'),
    setQueue: (items) => ipcRenderer.invoke('set-queue', items),
    removeFromQueue: (id) => ipcRenderer.invoke('remove-from-queue', id),
    clearQueue: () => ipcRenderer.invoke('clear-queue'),
    playFromQueue: (index) => ipcRenderer.invoke('play-from-queue', index),
    notifyVideoEnded: () => ipcRenderer.invoke('video-ended'),
    onPlayVideo: (callback) => {
      const handler = (_event, videoId) => callback(videoId);
      ipcRenderer.on('play-video', handler);
      return () => ipcRenderer.removeListener('play-video', handler);
    },
    onQueueUpdated: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on('queue-updated', handler);
      return () => ipcRenderer.removeListener('queue-updated', handler);
    }
  });
} catch (error) {
  console.error('[PRELOAD] Error exposing electronAPI:', error);
  throw error;
}
