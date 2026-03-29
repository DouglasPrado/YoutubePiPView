import { app, BrowserWindow, ipcMain, Tray, nativeImage, shell } from 'electron';
import { createWindow, createQueueWindow } from './window';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { stopServer } from './server';
import { initQueueStore, getQueue, saveQueue, broadcastQueueUpdate, playVideoNow } from './queue-store';
import Store from 'electron-store';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { QueueItem, QueueState } from '../types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store<{
  lastVideoId?: string;
  windowSize?: { width: number; height: number };
  queue?: QueueState;
}>();

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;
let queueWindow: InstanceType<typeof BrowserWindow> | null = null;
let tray: InstanceType<typeof Tray> | null = null;
let isQuitting = false;

initQueueStore(store, () => ({ main: mainWindow, queue: queueWindow }));

// Register ytview:// protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('ytview', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('ytview');
}

function handleProtocolUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === '/play' || parsed.host === 'play') {
      const videoId = parsed.searchParams.get('v');
      if (videoId) {
        // Wait for window to be ready before playing
        const tryPlay = () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            playVideoNow(videoId);
          } else {
            setTimeout(tryPlay, 500);
          }
        };
        tryPlay();
      }
    }
  } catch {
    // Invalid URL, ignore
  }
}

// macOS: handle protocol URL when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// Handle protocol URL from launch args (Windows/Linux)
const protocolArg = process.argv.find(arg => arg.startsWith('ytview://'));
if (protocolArg) {
  app.whenReady().then(() => handleProtocolUrl(protocolArg));
}

app.whenReady().then(async () => {
  mainWindow = await createWindow();
  if (mainWindow) {
    registerShortcuts(mainWindow);

  }

  // Criar ícone na barra de menu (Tray) - macOS
  if (process.platform === 'darwin') {
    try {
      // Template icon para macOS (adapta automaticamente ao tema claro/escuro)
      const iconPath = path.join(__dirname, '../../assets/tray-iconTemplate.png');
      let trayImage;

      try {
        trayImage = nativeImage.createFromPath(iconPath);
        trayImage.setTemplateImage(true);
      } catch (e) {
        // Fallback para ícone regular
        const fallbackPath = path.join(__dirname, '../../assets/tray-icon.png');
        try {
          trayImage = nativeImage.createFromPath(fallbackPath);
        } catch (e2) {
          trayImage = nativeImage.createEmpty();
        }
      }

      tray = new Tray(trayImage || nativeImage.createEmpty());
      tray.setToolTip('YTView - YouTube PiP');

      // Menu do Tray
      tray.setContextMenu(null); // Sem menu por enquanto

      // Clicar no Tray para mostrar/ocultar janela
      tray.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            // Focar quando usuário clica no tray (ação do usuário)
            mainWindow.focus();
          }
        }
      });
    } catch (error) {
      console.error('Erro ao criar Tray:', error);
    }
  }

  // Cmd+W: Fechar janela (minimizar para dock)
  if (mainWindow) {
    mainWindow.on("close", (event: any) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow();
      if (mainWindow) {
        registerShortcuts(mainWindow);

      }
      if (mainWindow) {
        mainWindow.on("close", (event: any) => {
          if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
          }
        });
      }
    } else if (mainWindow) {
      mainWindow.show();
      // Não focar automaticamente - deixar usuário clicar para focar
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    stopServer();
    app.quit();
  }
});

app.on('will-quit', () => {
  isQuitting = true;
  unregisterShortcuts();
  stopServer();
});

// IPC Handlers
ipcMain.handle('get-stored-video', (_: any) => {
  return store.get('lastVideoId') || null;
});

ipcMain.handle('save-video', (_: any, videoId: string) => {
  store.set('lastVideoId', videoId);
});

ipcMain.handle('get-stored-volume', (_: any) => {
  return store.get('volume') ?? 100;
});

ipcMain.handle('save-volume', (_: any, volume: number) => {
  store.set('volume', volume);
});

ipcMain.handle('get-window-size', (_: any) => {
  return store.get('windowSize') || null;
});

ipcMain.handle('save-window-size', (_: any, size: { width: number; height: number }) => {
  store.set('windowSize', size);
});

// Handler para mover a janela (usado para arrastar)
ipcMain.on('window-move', (_event: any, { deltaX, deltaY }: any) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + deltaX, y + deltaY);
  }
});

// Handler para abrir URL no navegador
ipcMain.handle('open-external-url', async (_: any, url: string) => {
  try {
    console.log('Abrindo URL externa:', url);
    await shell.openExternal(url);
    console.log('URL aberta com sucesso');
  } catch (error) {
    console.error('Erro ao abrir URL:', error);
    throw error;
  }
});

// Handler para toggle fullscreen
ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    if (!isFullScreen) {
      // Entrar em fullscreen
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setFullScreen(true);
    } else {
      // Sair de fullscreen e restaurar PiP
      mainWindow.setFullScreen(false);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (process.platform === 'darwin') {
            mainWindow.setAlwaysOnTop(true, 'floating');
            mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          } else {
            mainWindow.setAlwaysOnTop(true, 'floating');
            mainWindow.setVisibleOnAllWorkspaces(true);
          }
        }
      }, 300);
    }
    return !isFullScreen;
  }
  return false;
});

// Handler para minimizar a janela (pausar vídeo e tornar transparente)
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    // Tornar janela transparente
    mainWindow.setOpacity(0.01); // Quase transparente, mas ainda visível para o sistema
    mainWindow.setVisibleOnAllWorkspaces(false);
  }
});

// Handler para fechar a aplicação completamente
ipcMain.handle('close-window', () => {
  isQuitting = true;
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

// ===== Queue/Playlist IPC Handlers =====

ipcMain.handle('open-queue-window', async () => {
  if (queueWindow && !queueWindow.isDestroyed()) {
    queueWindow.focus();
    return;
  }
  queueWindow = await createQueueWindow();
  queueWindow.on('closed', () => {
    queueWindow = null;
  });
});

ipcMain.handle('get-queue', () => {
  return getQueue();
});

ipcMain.handle('set-queue', (_: any, items: QueueItem[]) => {
  const queue = getQueue();
  queue.items = items;
  saveQueue(queue);
  broadcastQueueUpdate(queue);
});

ipcMain.handle('remove-from-queue', (_: any, id: string) => {
  const queue = getQueue();
  const removedIndex = queue.items.findIndex(item => item.id === id);
  if (removedIndex === -1) return;

  queue.items = queue.items.filter(item => item.id !== id);

  // Adjust currentIndex
  if (queue.currentIndex >= 0) {
    if (removedIndex < queue.currentIndex) {
      queue.currentIndex--;
    } else if (removedIndex === queue.currentIndex) {
      queue.currentIndex = -1;
    }
  }

  saveQueue(queue);
  broadcastQueueUpdate(queue);
});

ipcMain.handle('clear-queue', () => {
  const queue: QueueState = { items: [], currentIndex: -1 };
  saveQueue(queue);
  broadcastQueueUpdate(queue);
});

ipcMain.handle('play-from-queue', (_: any, index: number) => {
  const queue = getQueue();
  if (index < 0 || index >= queue.items.length) return;

  queue.currentIndex = index;
  saveQueue(queue);

  const videoId = queue.items[index].videoId;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-video', videoId);
  }

  broadcastQueueUpdate(queue);
});

ipcMain.handle('video-ended', () => {
  const queue = getQueue();
  if (queue.currentIndex < 0) return;

  const nextIndex = queue.currentIndex + 1;
  if (nextIndex < queue.items.length) {
    queue.currentIndex = nextIndex;
    saveQueue(queue);

    const videoId = queue.items[nextIndex].videoId;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('play-video', videoId);
    }

    broadcastQueueUpdate(queue);
  } else {
    // End of queue
    queue.currentIndex = -1;
    saveQueue(queue);
    broadcastQueueUpdate(queue);
  }
});
