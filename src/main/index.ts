import { app, BrowserWindow, shell, protocol, net } from 'electron';
import { join, extname } from 'path';
import * as fs from 'fs';
import { is } from '@electron-toolkit/utils';

import { registerIpcHandlers } from './ipc-handlers';
import { recoverPendingJobs } from './services/pending-jobs-recovery';

// Включаем аппаратную поддержку воспроизведения H.265/HEVC видео на Windows/macOS
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');

// Регистрируем кастомный протокол для проксирования видео (обход CORS/CDN ограничений)
// ВАЖНО: должен вызываться ДО app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-proxy',
    privileges: { stream: true, corsEnabled: true, supportFetchAPI: true },
  },
]);

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Koteyye Media Studio',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // Обработчик протокола media-proxy://
  // Видео проксируется через main-процесс Node.js, минуя CORS-ограничения renderer'а.
  // Поддерживает Range-заголовки для перемотки видео в плеере.
  protocol.handle('media-proxy', async (request) => {
    const parsed = new URL(request.url);
    const realUrl = parsed.searchParams.get('url');
    if (!realUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    try {
      if (realUrl.startsWith('http://') || realUrl.startsWith('https://')) {
        // Пробрасываем Range-заголовок для поддержки перемотки
        const fetchHeaders: Record<string, string> = {};
        const range = request.headers.get('Range');
        if (range) fetchHeaders['Range'] = range;

        const response = await net.fetch(realUrl, { headers: fetchHeaders });
        return response;
      } else {
        // Чтение локального файла с диска
        const filePath = decodeURIComponent(realUrl);
        if (!fs.existsSync(filePath)) {
          return new Response('File not found', { status: 404 });
        }

        const mimeTypes: Record<string, string> = {
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
        };
        const ext = extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const range = request.headers.get('Range');

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const fileStream = fs.createReadStream(filePath, { start, end });

          return new Response(fileStream as any, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize.toString(),
              'Content-Type': contentType,
            }
          });
        } else {
          const fileStream = fs.createReadStream(filePath);
          return new Response(fileStream as any, {
            headers: {
              'Content-Length': fileSize.toString(),
              'Content-Type': contentType,
              'Accept-Ranges': 'bytes',
            }
          });
        }
      }
    } catch (err) {
      console.error('[media-proxy] Error:', err);
      return new Response('Failed to handle media request', { status: 502 });
    }
  });


  registerIpcHandlers();
  createWindow();

  // Фоновое восстановление незавершённых задач генерации
  // (не блокирует запуск приложения — выполняется асинхронно)
  recoverPendingJobs().catch((err) => {
    console.error('[pending-recovery] Критическая ошибка при восстановлении:', err);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
