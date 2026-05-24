import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

import {
  fetchImageModels,
  fetchVideoModels,
  generateVideo,
  generateImage,
  pollVideoStatus,
  downloadVideoContent,
  fetchCredits,
} from './openrouter';
import { uploadFrameImage } from './services/i2v-uploader';
import * as historyStore from './services/history-store';
import { uploadToTmpfiles } from './services/tmpfiles';
import { verifyPublicImageUrl } from './services/url-verifier';
import type { AppConfig, IpcResult, MediaType, OpenRouterFrameImage, GenerationHistoryItem } from '../shared/ipc-types';

export const configStore = new Store<AppConfig>({
  defaults: {
    apiKey: '',
    generationMode: '',
    mediaType: '',
    selectedModel: '',
    i2vSelectedModel: '',
    imgbbApiKey: '',
    localFolder: '',
    selectedModelT2I: '',
    selectedModelI2I: '',
    selectedModelI2V: '',
    selectedModelT2V: '',
    lang: 'ru',
  },
});


function requireApiKey(): string {
  const key = configStore.get('apiKey');
  if (!key) throw new Error('API key not configured');
  return key;
}

function wrap<T>(fn: () => T): IpcResult<T> {
  try { return { success: true, data: fn() }; }
  catch (err) {
    console.error("IPC Handler Error:", err);
    return { success: false, error: (err as Error).message };
  }
}

async function wrapAsync<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try { return { success: true, data: await fn() }; }
  catch (err) {
    console.error("IPC Async Handler Error:", err);
    if ((err as any).cause) {
      console.error("Cause:", (err as any).cause);
    }
    return { success: false, error: (err as Error).message };
  }
}

async function downloadImageContent(url: string, outputPath: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}


const promptSchema = z.string().min(3);
const jobIdSchema = z.string().min(1);
const urlSchema = z.string().startsWith('https://');
const localFilePathSchema = z.string().min(1);

function resolveSavedFilePath(filePath: string): string {
  const safePath = path.resolve(localFilePathSchema.parse(filePath));
  const localFolder = configStore.get('localFolder');
  if (!localFolder) throw new Error('Папка сохранения не настроена');

  const safeLocalFolder = path.resolve(localFolder);
  const relativePath = path.relative(safeLocalFolder, safePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Файл находится вне папки сохранения');
  }

  if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
    throw new Error('Файл не найден');
  }

  return safePath;
}

async function uploadAudioFile(filePath: string): Promise<UploadedFrameImage> {
  const fileName = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error('File does not exist');
  }
  const stat = fs.statSync(filePath);
  const MAX_AUDIO_SIZE = 30 * 1024 * 1024; // 30 MB
  if (stat.size > MAX_AUDIO_SIZE) {
    throw new Error(`File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum: 30 MB`);
  }
  const ext = path.extname(fileName).toLowerCase();
  const allowedAudioExts = ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'];
  if (!allowedAudioExts.includes(ext)) {
    throw new Error(`Unsupported audio format: ${ext}`);
  }

  const mimeMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.m4a': 'audio/x-m4a',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
  };

  console.log("[audio-uploader] Uploading audio to Piximg...", filePath);
  const url = await uploadToTmpfiles(filePath); // Всегда без ImgBB ключа, чтобы грузить на Piximg

  console.log("[audio-uploader] Verifying URL...", url);
  await verifyPublicImageUrl(url);

  return {
    frameType: 'first_frame', // Совместимость с типом
    provider: 'tmpfiles',
    url,
    originalFileName: fileName,
    mimeType: mimeMap[ext] || 'audio/mpeg',
    sizeBytes: stat.size,
    uploadedAt: new Date().toISOString(),
  };
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', () => wrap(() => ({
    apiKey: configStore.get('apiKey'),
    generationMode: configStore.get('generationMode'),
    mediaType: configStore.get('mediaType'),
    selectedModel: configStore.get('selectedModel'),
    i2vSelectedModel: configStore.get('i2vSelectedModel'),
    imgbbApiKey: configStore.get('imgbbApiKey'),
    localFolder: configStore.get('localFolder') ?? '',
    selectedModelT2I: configStore.get('selectedModelT2I') ?? '',
    selectedModelI2I: configStore.get('selectedModelI2I') ?? '',
    selectedModelI2V: configStore.get('selectedModelI2V') ?? '',
    selectedModelT2V: configStore.get('selectedModelT2V') ?? '',
    lang: configStore.get('lang') ?? 'ru',
  })));

  ipcMain.handle('config:set', (_e, partial: Partial<AppConfig>) => wrap(() => {
    const keys: (keyof AppConfig)[] = ['apiKey', 'generationMode', 'mediaType', 'selectedModel', 'i2vSelectedModel', 'imgbbApiKey', 'localFolder', 'selectedModelT2I', 'selectedModelI2I', 'selectedModelI2V', 'selectedModelT2V', 'lang'];
    for (const k of keys) {
      if (partial[k] !== undefined) configStore.set(k, partial[k] as never);
    }
  }));


  ipcMain.handle('models:fetch', async (_e, mediaType: MediaType) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    return mediaType === 'video' ? fetchVideoModels(apiKey) : fetchImageModels(apiKey);
  }));

  // ---- Text-to-Video ----
  ipcMain.handle('video:generate', async (_e, params) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    const model = configStore.get('selectedModel');
    if (!model) throw new Error('No model selected');
    const prompt = promptSchema.parse(params.prompt);
    const result = await generateVideo(apiKey, model, { ...params, prompt });
    historyStore.create({
      mode: 'text-to-video',
      model,
      prompt,
      status: 'pending',
      jobId: result.id,
      remoteUrls: [],
      localPaths: [],
      resolution: params.resolution,
      aspectRatio: params.aspect_ratio,
      duration: params.duration,
      generateAudio: params.generate_audio,
      seed: params.seed,
    });
    return result;
  }));

  ipcMain.handle('video:poll', async (_e, pollingUrl: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    urlSchema.parse(pollingUrl);
    const status = await pollVideoStatus(apiKey, pollingUrl);
    const jobId = pollingUrl.split('/').pop() ?? '';

    let localPaths: string[] = [];
    if (status.status === 'completed' && status.unsigned_urls?.length) {
      const localFolder = configStore.get('localFolder');
      if (localFolder && fs.existsSync(localFolder)) {
        try {
          const outputPath = path.join(localFolder, `video-${jobId}.mp4`);
          await downloadVideoContent(apiKey, jobId, outputPath);
          localPaths.push(outputPath);
        } catch (err) {
          console.error("Auto-download video failed:", err);
        }
      }
    }

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
      historyStore.updateByJobId(jobId, {
        status: status.status,
        generationId: status.generation_id,
        error: status.error,
        remoteUrls: status.unsigned_urls ?? [],
        localPaths: localPaths.length ? localPaths : undefined,
        usage: status.usage,
      });
    } else {
      historyStore.updateByJobId(jobId, { status: status.status });
    }
    return { ...status, localPaths: localPaths.length ? localPaths : undefined };
  }));


  ipcMain.handle('video:download', async (_e, jobId: string, outputPath: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    jobIdSchema.parse(jobId);
    const path = await downloadVideoContent(apiKey, jobId, outputPath);
    historyStore.updateByJobId(jobId, { localPaths: [path] });
    return path;
  }));

  // ---- Text-to-Image / Image-to-Image ----
  ipcMain.handle('image:generate', async (_e, prompt: string, imageUrl?: string, options?: import('../shared/ipc-types').ImageGenerateOptions) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    const model = configStore.get('selectedModel');
    if (!model) throw new Error('No model selected');
    const safePrompt = promptSchema.parse(prompt);

    const result = await generateImage(apiKey, model, safePrompt, imageUrl, options);

    const localFolder = configStore.get('localFolder');
    const localPaths: string[] = [];
    if (localFolder && fs.existsSync(localFolder) && result.urls?.length) {
      try {
        const filename = `image-${Date.now()}.png`;
        const outputPath = path.join(localFolder, filename);
        await downloadImageContent(result.urls[0], outputPath);
        localPaths.push(outputPath);
      } catch (err) {
        console.error("Auto-download image failed:", err);
      }
    }

    historyStore.create({
      mode: imageUrl ? 'image-to-image' : 'text-to-image',
      model,
      prompt: safePrompt,
      status: 'completed',
      remoteUrls: result.urls,
      localPaths,
      usage: result.usage,
    });
    return { ...result, localPaths };
  }));


  // ---- Image-to-Video ----
  ipcMain.handle('i2v:get-models', async () => wrapAsync(async () => {
    const apiKey = requireApiKey();
    const models = await fetchVideoModels(apiKey);
    return models.filter((m) => m.supported_frame_images?.includes('first_frame'));
  }));

  ipcMain.handle('i2v:upload-image', async (_e, filePath: string) => wrapAsync(async () => {
    const imgbbApiKey = configStore.get('imgbbApiKey');
    return await uploadFrameImage(filePath, imgbbApiKey);
  }));

  ipcMain.handle('i2v:generate', async (_e, input) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    if (!input.model) throw new Error('No model selected');
    const safePrompt = promptSchema.parse(input.prompt);
    if (!input.firstFrame) throw new Error('First frame is required');

    const firstFrame = input.firstFrame;
    const lastFrame = input.lastFrame;
    const refImage = input.refImage;
    const audioRef = input.audioRef;

    const frameImages: OpenRouterFrameImage[] = [
      { type: 'image_url', image_url: { url: firstFrame.url }, frame_type: 'first_frame' },
    ];
    if (lastFrame) {
      frameImages.push({ type: 'image_url', image_url: { url: lastFrame.url }, frame_type: 'last_frame' });
    }

    const body: Record<string, unknown> = {
      model: input.model,
      prompt: safePrompt,
      frame_images: frameImages,
    };

    if (refImage) {
      body.input_references = [
        { type: 'image_url', image_url: { url: refImage.url } }
      ];
    }

    if (audioRef) {
      body.audio_ref = audioRef.url;
    }

    if (input.resolution) body.resolution = input.resolution;
    if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
    if (input.duration !== undefined && input.duration > 0) body.duration = input.duration;
    if (input.generateAudio !== undefined) {
      body.generate_audio = input.generateAudio;
    }
    if (input.seed !== undefined) body.seed = input.seed;

    const res = await fetch('https://openrouter.ai/api/v1/videos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Video generation request failed: ${res.status} - ${text}`);
    }
    const json = await res.json();

    historyStore.create({
      mode: 'image-to-video',
      model: input.model,
      prompt: safePrompt,
      status: json.status ?? 'pending',
      jobId: json.id,
      remoteUrls: [],
      localPaths: [],
      resolution: input.resolution,
      aspectRatio: input.aspectRatio,
      duration: input.duration,
      generateAudio: input.generateAudio,
      seed: input.seed,
      firstFrame,
      lastFrame,
    });

    return { id: json.id, polling_url: json.polling_url };
  }));

  ipcMain.handle('i2v:poll', async (_e, jobId: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    jobIdSchema.parse(jobId);
    const status = await (async () => {
      const res = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Polling failed: ${res.status} - ${text}`);
      }
      return await res.json();
    })();

    let localPaths: string[] = [];
    if (status.status === 'completed' && status.unsigned_urls?.length) {
      const localFolder = configStore.get('localFolder');
      if (localFolder && fs.existsSync(localFolder)) {
        try {
          const outputPath = path.join(localFolder, `video-${jobId}.mp4`);
          await downloadVideoContent(apiKey, jobId, outputPath);
          localPaths.push(outputPath);
        } catch (err) {
          console.error("Auto-download video failed:", err);
        }
      }
    }

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
      historyStore.updateByJobId(jobId, {
        status: status.status,
        generationId: status.generation_id,
        error: status.error,
        remoteUrls: status.unsigned_urls ?? [],
        localPaths: localPaths.length ? localPaths : undefined,
        usage: status.usage,
      });
    } else {
      historyStore.updateByJobId(jobId, { status: status.status });
    }
    return { ...status, localPaths: localPaths.length ? localPaths : undefined };
  }));


  ipcMain.handle('i2v:download', async (_e, jobId: string, outputPath: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    jobIdSchema.parse(jobId);
    const path = await downloadVideoContent(apiKey, jobId, outputPath);
    historyStore.updateByJobId(jobId, { localPaths: [path] });
    return path;
  }));

  // ---- Credits / Balance ----
  ipcMain.handle('credits:fetch', async () => wrapAsync(async () => {
    const apiKey = requireApiKey();
    return await fetchCredits(apiKey);
  }));

  // ---- Unified History ----
  ipcMain.handle('history:list', () => wrap(() => historyStore.listHistory()));
  ipcMain.handle('history:delete', (_e, id: string) => wrap(() => historyStore.deleteFromHistory(id)));
  ipcMain.handle('history:recover-pending', async () => wrapAsync(async () => {
    const { recoverPendingJobs } = await import('./services/pending-jobs-recovery');
    await recoverPendingJobs();
  }));

  // ---- File dialogs ----
  ipcMain.handle('dialog:open-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: true, data: null };
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    return { success: true, data: result.canceled ? null : result.filePaths[0] };
  });

  ipcMain.handle('dialog:save-file', async (_e, defaultName: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: true, data: null };
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'Video', extensions: ['mp4'] }],
    });
    return { success: true, data: result.canceled ? null : result.filePath };
  });

  ipcMain.handle('dialog:open-directory', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: true, data: null };
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    return { success: true, data: result.canceled ? null : result.filePaths[0] };
  });

  ipcMain.handle('dialog:open-audio-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: true, data: null };
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'] }],
    });
    return { success: true, data: result.canceled ? null : result.filePaths[0] };
  });

  ipcMain.handle('audio:upload', async (_e, filePath: string) => wrapAsync(async () => {
    return await uploadAudioFile(filePath);
  }));

  ipcMain.handle('file:open', async (_e, filePath: string) => wrapAsync(async () => {
    const safePath = resolveSavedFilePath(filePath);

    const errorMessage = await shell.openPath(safePath);
    if (errorMessage) throw new Error(errorMessage);
  }));

  ipcMain.handle('file:show-in-folder', (_e, filePath: string) => wrap(() => {
    const safePath = resolveSavedFilePath(filePath);

    shell.showItemInFolder(safePath);
  }));

  ipcMain.handle('config:test-connection', async (_e, apiKey: string) => wrapAsync(async () => {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Invalid API Key or connection error: ${res.status}`);
    }
    return true;
  }));
}
