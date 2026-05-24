import type { AppConfig, OpenRouterModel, VideoGenerateParams, VideoJobResult, VideoJobStatus, IpcResult, MediaType, ImageGenerationResult, I2VGenerateInput, GenerationHistoryItem, UploadedFrameImage } from '../shared/ipc-types';

export interface ElectronAPI {
  getConfig: () => Promise<IpcResult<AppConfig>>;
  setConfig: (config: Partial<AppConfig>) => Promise<IpcResult<void>>;
  fetchModels: (mediaType: MediaType) => Promise<IpcResult<OpenRouterModel[]>>;
  generateVideo: (params: VideoGenerateParams) => Promise<IpcResult<VideoJobResult>>;
  pollVideo: (pollingUrl: string) => Promise<IpcResult<VideoJobStatus>>;
  generateImage: (prompt: string) => Promise<IpcResult<ImageGenerationResult>>;

  i2vGetModels: () => Promise<IpcResult<OpenRouterModel[]>>;
  i2vUploadImage: (filePath: string) => Promise<IpcResult<UploadedFrameImage>>;
  i2vGenerate: (input: I2VGenerateInput) => Promise<IpcResult<VideoJobResult>>;
  i2vPoll: (jobId: string) => Promise<IpcResult<VideoJobStatus>>;
  i2vDownload: (jobId: string, outputPath: string) => Promise<IpcResult<string>>;
  videoDownload: (jobId: string, outputPath: string) => Promise<IpcResult<string>>;

  historyList: () => Promise<IpcResult<GenerationHistoryItem[]>>;
  historyDelete: (id: string) => Promise<IpcResult<void>>;

  openFileDialog: () => Promise<IpcResult<string | null>>;
  saveFileDialog: (defaultName: string) => Promise<IpcResult<string | null>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
