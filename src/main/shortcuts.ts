import electron from 'electron';
const { globalShortcut, BrowserWindow } = electron;

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;

export function registerShortcuts(window: InstanceType<typeof BrowserWindow>): void{
  mainWindow = window;

  // Cmd+Shift+Y: Abrir/focar janela ou restaurar se minimizada/transparente
  const registered = globalShortcut.register('CommandOrControl+Shift+Y', () => {
    if (mainWindow) {
      const opacity = mainWindow.getOpacity();
      const isTransparent = opacity < 0.5;

      if (isTransparent) {
        // Se estiver transparente (minimizada), restaurar opacidade
        mainWindow.setOpacity(1.0);
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        mainWindow.show();
        mainWindow.focus();
      } else if (mainWindow.isMinimized()) {
        // Se estiver minimizada, restaurar
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else if (mainWindow.isVisible()) {
        // Se estiver visível, focar
        mainWindow.focus();
      } else {
        // Se estiver escondida, mostrar
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  if (!registered) {
    console.error('Falha ao registrar atalho Control+Shift+Y');
  } else {
    console.log('Atalho Control+Shift+Y registrado com sucesso');
  }

  // Cmd+W: Fechar janela (minimizar para dock) - gerenciado no main.ts
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
