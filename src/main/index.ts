import { app, BrowserWindow, shell, protocol, net } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { registerIpcHandlers } from './ipc-handlers';

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
    title: 'OpenRouter Media Client',
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
      // Пробрасываем Range-заголовок для поддержки перемотки
      const fetchHeaders: Record<string, string> = {};
      const range = request.headers.get('Range');
      if (range) fetchHeaders['Range'] = range;

      const response = await net.fetch(realUrl, { headers: fetchHeaders });
      return response;
    } catch (err) {
      console.error('[media-proxy] Fetch error:', err);
      return new Response('Failed to fetch media', { status: 502 });
    }
  });

  registerIpcHandlers();
  createWindow();

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
