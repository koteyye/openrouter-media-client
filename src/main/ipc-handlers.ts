import { ipcMain, dialog, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { z } from 'zod';
import {
  fetchImageModels,
  fetchVideoModels,
  generateVideo,
  generateImage,
  pollVideoStatus,
  downloadVideoContent,
} from './openrouter';
import { uploadFrameImage } from './services/i2v-uploader';
import * as historyStore from './services/history-store';
import type { AppConfig, IpcResult, MediaType, OpenRouterFrameImage, GenerationHistoryItem } from '../shared/ipc-types';

const configStore = new Store<AppConfig>({
  defaults: {
    apiKey: '',
    generationMode: '',
    mediaType: '',
    selectedModel: '',
    i2vSelectedModel: '',
    imgbbApiKey: '',
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

const promptSchema = z.string().min(3);
const jobIdSchema = z.string().min(1);
const urlSchema = z.string().startsWith('https://');

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', () => wrap(() => ({
    apiKey: configStore.get('apiKey'),
    generationMode: configStore.get('generationMode'),
    mediaType: configStore.get('mediaType'),
    selectedModel: configStore.get('selectedModel'),
    i2vSelectedModel: configStore.get('i2vSelectedModel'),
    imgbbApiKey: configStore.get('imgbbApiKey'),
  })));

  ipcMain.handle('config:set', (_e, partial: Partial<AppConfig>) => wrap(() => {
    const keys: (keyof AppConfig)[] = ['apiKey', 'generationMode', 'mediaType', 'selectedModel', 'i2vSelectedModel', 'imgbbApiKey'];
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
    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
      historyStore.updateByJobId(jobId, {
        status: status.status,
        generationId: status.generation_id,
        error: status.error,
        remoteUrls: status.unsigned_urls ?? [],
        usage: status.usage,
      });
    } else {
      historyStore.updateByJobId(jobId, { status: status.status });
    }
    return status;
  }));

  ipcMain.handle('video:download', async (_e, jobId: string, outputPath: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    jobIdSchema.parse(jobId);
    const path = await downloadVideoContent(apiKey, jobId, outputPath);
    historyStore.updateByJobId(jobId, { localPaths: [path] });
    return path;
  }));

  // ---- Text-to-Image ----
  ipcMain.handle('image:generate', async (_e, prompt: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    const model = configStore.get('selectedModel');
    if (!model) throw new Error('No model selected');
    const safePrompt = promptSchema.parse(prompt);
    const result = await generateImage(apiKey, model, safePrompt);
    historyStore.create({
      mode: 'text-to-image',
      model,
      prompt: safePrompt,
      status: 'completed',
      remoteUrls: result.urls,
      localPaths: [],
      usage: result.usage,
    });
    return result;
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
    if (input.resolution) body.resolution = input.resolution;
    if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
    if (input.duration !== undefined && input.duration > 0) body.duration = input.duration;
    if (input.generateAudio !== undefined) body.generate_audio = input.generateAudio;
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

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
      historyStore.updateByJobId(jobId, {
        status: status.status,
        generationId: status.generation_id,
        error: status.error,
        remoteUrls: status.unsigned_urls ?? [],
        usage: status.usage,
      });
    } else {
      historyStore.updateByJobId(jobId, { status: status.status });
    }
    return status;
  }));

  ipcMain.handle('i2v:download', async (_e, jobId: string, outputPath: string) => wrapAsync(async () => {
    const apiKey = requireApiKey();
    jobIdSchema.parse(jobId);
    const path = await downloadVideoContent(apiKey, jobId, outputPath);
    historyStore.updateByJobId(jobId, { localPaths: [path] });
    return path;
  }));

  // ---- Unified History ----
  ipcMain.handle('history:list', () => wrap(() => historyStore.listHistory()));
  ipcMain.handle('history:delete', (_e, id: string) => wrap(() => historyStore.deleteFromHistory(id)));

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
}
