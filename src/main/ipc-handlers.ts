import { ipcMain } from 'electron';
import Store from 'electron-store';
import { fetchImageModels, fetchVideoModels, generateVideo, pollVideoStatus } from './openrouter';
import type { AppConfig, IpcResult, MediaType } from '../shared/ipc-types';

const store = new Store<AppConfig>({
  defaults: {
    apiKey: '',
    mediaType: '',
    selectedModel: '',
  },
});

function getConfig(): AppConfig {
  return {
    apiKey: store.get('apiKey'),
    mediaType: store.get('mediaType'),
    selectedModel: store.get('selectedModel'),
  };
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', (): IpcResult<AppConfig> => {
    try {
      return { success: true, data: getConfig() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('config:set', (_event, partial: Partial<AppConfig>): IpcResult<void> => {
    try {
      if (partial.apiKey !== undefined) store.set('apiKey', partial.apiKey);
      if (partial.mediaType !== undefined) store.set('mediaType', partial.mediaType);
      if (partial.selectedModel !== undefined) store.set('selectedModel', partial.selectedModel);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('models:fetch', async (_event, mediaType: MediaType) => {
    try {
      const apiKey = store.get('apiKey');
      if (!apiKey) return { success: false, error: 'API key not configured' };

      const models =
        mediaType === 'video'
          ? await fetchVideoModels(apiKey)
          : await fetchImageModels(apiKey);

      return { success: true, data: models };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('video:generate', async (_event, params) => {
    try {
      const apiKey = store.get('apiKey');
      const model = store.get('selectedModel');
      if (!apiKey) return { success: false, error: 'API key not configured' };
      if (!model) return { success: false, error: 'No model selected' };
      if (!params.prompt) return { success: false, error: 'Prompt is required' };
      const result = await generateVideo(apiKey, model, params);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('video:poll', async (_event, pollingUrl: string) => {
    try {
      const apiKey = store.get('apiKey');
      if (!apiKey) return { success: false, error: 'API key not configured' };
      const status = await pollVideoStatus(apiKey, pollingUrl);
      return { success: true, data: status };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
