import type { AppConfig, OpenRouterModel, VideoGenerateParams, VideoJobResult, VideoJobStatus, IpcResult, MediaType } from '../shared/ipc-types';

export interface ElectronAPI {
  getConfig: () => Promise<IpcResult<AppConfig>>;
  setConfig: (config: Partial<AppConfig>) => Promise<IpcResult<void>>;
  fetchModels: (mediaType: MediaType) => Promise<IpcResult<OpenRouterModel[]>>;
  generateVideo: (params: VideoGenerateParams) => Promise<IpcResult<VideoJobResult>>;
  pollVideo: (pollingUrl: string) => Promise<IpcResult<VideoJobStatus>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
