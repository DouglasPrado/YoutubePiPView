import { app, BrowserWindow, ipcMain, Tray, nativeImage, shell } from 'electron';
import { createWindow, applyMacOSPiPSettings } from './window';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { stopServer } from './server';
import Store from 'electron-store';
import * as path from 'path';

const store = new Store<{ lastVideoId?: string; windowSize?: { width: number; height: number } }>();

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;
let tray: InstanceType<typeof Tray> | null = null;
let isQuitting = false;

app.whenReady().then(async () => {
  mainWindow = await createWindow();
  if (mainWindow) {
    registerShortcuts(mainWindow);

    // Monitoramento de foco para reaplicar configurações PiP no macOS
    if (process.platform === 'darwin') {
      // Reaplicar configurações quando janela perder foco
      mainWindow.on('blur', () => {
        if (mainWindow && mainWindow.isVisible()) {
          // Pequeno delay para reaplicar
          setTimeout(() => {
            if (mainWindow) {
              mainWindow.setAlwaysOnTop(true, "pop-up-menu");
              // Não focar automaticamente - deixar usuário clicar para focar
            }
          }, 50);
        }
      });

      // Reaplicar quando janela for mostrada (mudança de workspace)
      mainWindow.on('show', () => {
        if (mainWindow) {
          applyMacOSPiPSettings(mainWindow);
          // Não focar automaticamente - deixar usuário clicar para focar
        }
      });
    }
  }

  // Criar ícone na barra de menu (Tray) - macOS
  if (process.platform === 'darwin') {
    try {
      // Criar um ícone simples (pode ser substituído por um arquivo de imagem)
      const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
      let trayImage;

      try {
        trayImage = nativeImage.createFromPath(iconPath);
      } catch (e) {
        // Se não houver ícone, criar um ícone simples
        trayImage = nativeImage.createEmpty();
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

        // Monitoramento de foco para reaplicar configurações PiP no macOS
        if (process.platform === 'darwin') {
          mainWindow.on('blur', () => {
            if (mainWindow && mainWindow.isVisible()) {
              setTimeout(() => {
                if (mainWindow) {
                  mainWindow.setAlwaysOnTop(true, "pop-up-menu");
                  // Não focar automaticamente - deixar usuário clicar para focar
                }
              }, 50);
            }
          });

          mainWindow.on('show', () => {
            if (mainWindow) {
              applyMacOSPiPSettings(mainWindow);
              // Não focar automaticamente - deixar usuário clicar para focar
            }
          });
        }
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

// Handler para fechar a aplicação completamente
ipcMain.handle('close-window', () => {
  isQuitting = true;
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});
