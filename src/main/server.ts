import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

let server: http.Server | null = null;
let serverPort: number | null = null;
const DEFAULT_PORT = 8765;

// Mapeamento de extensões para MIME types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

/**
 * Verifica se uma porta está disponível
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = http.createServer();

    testServer.once('error', () => {
      resolve(false);
    });

    testServer.once('listening', () => {
      testServer.close();
      resolve(true);
    });

    testServer.listen(port, 'localhost');
  });
}

/**
 * Encontra uma porta disponível começando pela porta padrão
 */
async function findAvailablePort(startPort: number = DEFAULT_PORT): Promise<number> {
  let port = startPort;
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port++;
  }

  throw new Error(`Não foi possível encontrar uma porta disponível entre ${startPort} e ${port - 1}`);
}

/**
 * Inicia o servidor HTTP local
 */
export async function startServer(distPath: string): Promise<void> {
  if (server) {
    console.log('[Server] Servidor já está rodando na porta', serverPort);
    return;
  }

  // Verificar se o diretório dist existe
  if (!fs.existsSync(distPath)) {
    throw new Error(`Diretório dist não encontrado: ${distPath}`);
  }

  // Encontrar porta disponível
  const port = await findAvailablePort();

  server = http.createServer((req, res) => {
    // Normalizar a URL removendo query strings
    const urlPath = req.url?.split('?')[0] || '/';

    // Determinar o caminho do arquivo
    let filePath = path.join(distPath, urlPath === '/' ? 'index.html' : urlPath);

    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      // Se não existir, tentar servir index.html (para SPA routing)
      filePath = path.join(distPath, 'index.html');

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - Arquivo não encontrado');
        return;
      }
    }

    // Se for um diretório, servir o index.html
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - index.html não encontrado');
        return;
      }
    }

    // Determinar o Content-Type baseado na extensão
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Ler e servir o arquivo
    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error('[Server] Erro ao ler arquivo:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Erro interno do servidor');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });
  });

  return new Promise((resolve, reject) => {
    server!.once('error', (err) => {
      console.error('[Server] Erro ao iniciar servidor:', err);
      server = null;
      serverPort = null;
      reject(err);
    });

    server!.listen(port, 'localhost', () => {
      serverPort = port;
      console.log(`[Server] Servidor HTTP local iniciado em http://localhost:${port}`);
      resolve();
    });
  });
}

/**
 * Para o servidor HTTP local
 */
export function stopServer(): void {
  if (server) {
    server.close(() => {
      console.log('[Server] Servidor HTTP local encerrado');
    });
    server = null;
    serverPort = null;
  }
}

/**
 * Retorna a URL do servidor HTTP local
 */
export function getServerUrl(): string | null {
  if (serverPort) {
    return `http://localhost:${serverPort}`;
  }
  return null;
}
