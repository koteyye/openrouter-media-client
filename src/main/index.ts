import { app, BrowserWindow, dialog, Notification, shell, protocol, net } from 'electron';
import { join, extname } from 'path';
import * as fs from 'fs';
import { is } from '@electron-toolkit/utils';
import { autoUpdater } from 'electron-updater';

import { registerIpcHandlers } from './ipc-handlers';
import { recoverPendingJobs } from './services/pending-jobs-recovery';

const APP_ID = 'ru.koteyye.media-studio';
const RELEASES_URL = 'https://github.com/koteyye/koteyye-media-studio/releases';
const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/koteyye/koteyye-media-studio/releases/latest';
const APP_ICON_RESOURCE = 'icons/openrouter_media_client_windows_ico.ico';

// Включаем аппаратную поддержку воспроизведения H.265/HEVC видео на Windows/macOS
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.setAppUserModelId(APP_ID);

// Регистрируем кастомный протокол для проксирования видео (обход CORS/CDN ограничений)
// ВАЖНО: должен вызываться ДО app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-proxy',
    privileges: { stream: true, corsEnabled: true, supportFetchAPI: true },
  },
]);

function getAppIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, APP_ICON_RESOURCE)
    : join(__dirname, '../../src/assets/icons/openrouter_media_client_windows_ico.ico');
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '').split('-')[0];
}

function isVersionGreater(latestVersion: string, currentVersion: string): boolean {
  const latestParts = normalizeVersion(latestVersion).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const currentParts = normalizeVersion(currentVersion).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(latestParts.length, currentParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const latest = latestParts[i] ?? 0;
    const current = currentParts[i] ?? 0;
    if (latest > current) return true;
    if (latest < current) return false;
  }

  return false;
}

function showMacUpdateNotification(version: string, releaseUrl: string): void {
  const title = 'Доступна новая версия Koteyye Media Studio';
  const body = `Версия ${version} доступна на GitHub Releases. Нажмите, чтобы открыть страницу загрузки.`;

  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.on('click', () => {
      shell.openExternal(releaseUrl).catch((err) => {
        console.error('[updates] Failed to open release URL:', err);
      });
    });
    notification.show();
    return;
  }

  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  dialog.showMessageBox(win, {
    type: 'info',
    buttons: ['Открыть релиз', 'Позже'],
    defaultId: 0,
    cancelId: 1,
    title,
    message: title,
    detail: body,
  }).then(({ response }) => {
    if (response === 0) {
      shell.openExternal(releaseUrl).catch((err) => {
        console.error('[updates] Failed to open release URL:', err);
      });
    }
  }).catch((err) => {
    console.error('[updates] Failed to show macOS update dialog:', err);
  });
}

async function checkMacReleaseNotification(): Promise<void> {
  if (process.platform !== 'darwin' || !app.isPackaged) return;

  try {
    const response = await net.fetch(LATEST_RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `${app.getName()}/${app.getVersion()}`,
      },
    });

    if (!response.ok) {
      console.warn(`[updates] GitHub latest release check failed: ${response.status}`);
      return;
    }

    const release = await response.json() as { tag_name?: string; html_url?: string; name?: string };
    const latestVersion = release.tag_name ?? release.name;
    if (!latestVersion || !isVersionGreater(latestVersion, app.getVersion())) return;

    showMacUpdateNotification(latestVersion, release.html_url ?? RELEASES_URL);
  } catch (err) {
    console.error('[updates] macOS release check failed:', err);
  }
}

function configureWindowsAutoUpdates(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    console.error('[updates] Windows auto-update error:', err);
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Установить сейчас', 'Позже'],
      defaultId: 0,
      cancelId: 1,
      title: 'Обновление готово',
      message: `Koteyye Media Studio ${info.version} загружена`,
      detail: 'Приложение перезапустится и установит обновление.',
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    }).catch((err) => {
      console.error('[updates] Failed to show update dialog:', err);
    });
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updates] Failed to check Windows updates:', err);
  });
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Koteyye Media Studio',
    icon: getAppIconPath(),
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
  configureWindowsAutoUpdates();
  checkMacReleaseNotification().catch((err) => {
    console.error('[updates] macOS release notification failed:', err);
  });

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
