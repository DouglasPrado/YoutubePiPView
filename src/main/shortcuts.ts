import electron from 'electron';
const { globalShortcut, BrowserWindow } = electron;

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;

export function registerShortcuts(window: InstanceType<typeof BrowserWindow>): void{
  mainWindow = window;

  // Cmd+Shift+Y: Abrir/focar janela
  globalShortcut.register('CommandOrControl+Shift+Y', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Cmd+W: Fechar janela (minimizar para dock) - gerenciado no main.ts
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
