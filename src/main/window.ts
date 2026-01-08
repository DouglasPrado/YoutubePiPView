import electron from "electron";
import Store from "electron-store";
import * as path from "path";
import { fileURLToPath } from "url";
import { getServerUrl, startServer } from "./server.js";
const { BrowserWindow } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store<{
  windowSize?: { width: number; height: number };
  windowPosition?: { x: number; y: number };
}>();

export async function createWindow(): Promise<
  InstanceType<typeof BrowserWindow>
> {
  const storedSize = store.get("windowSize");
  const storedPosition = store.get("windowPosition");

  const defaultWidth = 400;

  const ASPECT_RATIO = 16 / 9;

  const preloadPath = path.resolve(__dirname, "../preload/preload.cjs");

  const distPath = path.join(__dirname, "../../dist");
  await startServer(distPath);

  let initialWidth = storedSize?.width || defaultWidth;
  let initialHeight = Math.round(initialWidth / ASPECT_RATIO);

  const win = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: storedPosition?.x,
    y: storedPosition?.y,
    frame: false,
    transparent: false,
    resizable: true,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    type: "panel", // NSPanel no macOS - melhor comportamento para PiP
    backgroundColor: "#000000",
    show: false, // Não mostrar até estar pronto
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Configuração de PiP - manter janela sempre no topo
  const applyPiPSettings = () => {
    if (process.platform === "darwin") {
      win.setAlwaysOnTop(true, "screen-saver");
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      win.setAlwaysOnTop(true, "floating");
      win.setVisibleOnAllWorkspaces(true);
    }
  };

  // Aplicar imediatamente
  applyPiPSettings();

  // Reaplicar após janela carregada com pequeno delay
  win.once("ready-to-show", () => {
    win.show();
    // Não focar automaticamente - deixar usuário clicar para focar

    // Delay de 100ms para garantir que janela está totalmente inicializada
    setTimeout(() => {
      applyPiPSettings();
    }, 100);
  });

  // Manter proporção 16:9
  let isResizing = false;

  win.on("will-resize", (event: any, newBounds: any) => {
    if (isResizing) return;
    event.preventDefault();

    const newHeight = Math.round(newBounds.width / ASPECT_RATIO);

    isResizing = true;
    win.setSize(newBounds.width, newHeight, false);
    isResizing = false;
  });

  win.on("resize", () => {
    if (isResizing) return;

    const bounds = win.getBounds();
    const expectedHeight = Math.round(bounds.width / ASPECT_RATIO);

    if (Math.abs(bounds.height - expectedHeight) > 1) {
      isResizing = true;
      win.setSize(bounds.width, expectedHeight, false);
      isResizing = false;
    }
  });

  // Salvar tamanho e posição
  const saveBounds = () => {
    const bounds = win.getBounds();
    store.set("windowSize", {
      width: bounds.width,
      height: bounds.height,
    });
    store.set("windowPosition", {
      x: bounds.x,
      y: bounds.y,
    });
  };

  win.on("moved", saveBounds);
  win.on("resized", saveBounds);

  const serverUrl = getServerUrl();
  if (serverUrl) {
    await win.loadURL(serverUrl);
  } else {
    const indexPath = path.join(__dirname, "../../dist/index.html");
    await win.loadFile(indexPath);
  }

  return win;
}

// Função para aplicar configurações de PiP no macOS
export function applyMacOSPiPSettings(
  win: InstanceType<typeof BrowserWindow>
): void {
  if (process.platform === "darwin") {
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    win.setAlwaysOnTop(true, "floating");
    win.setVisibleOnAllWorkspaces(true);
  }
}
