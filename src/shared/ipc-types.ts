export interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type MediaType = 'image' | 'video';

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  architecture?: {
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    image?: string;
    audio?: string;
    web_search?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    internal_reasoning?: string;
    [key: string]: string | undefined;
  };
  context_length?: number;
  supported_resolutions?: string[];
  supported_aspect_ratios?: string[];
  supported_sizes?: string[];
  supported_durations?: number[];
  supported_frame_images?: Array<'first_frame' | 'last_frame'>;
  generate_audio?: boolean;
  seed?: boolean | null;
  pricing_skus?: Record<string, string>;
  allowed_passthrough_parameters?: string[];
}

export interface VideoGenerateParams {
  prompt: string;
  frame_images?: OpenRouterFrameImage[];
  resolution?: string;
  aspect_ratio?: string;
  size?: string;
  duration?: number;
  seed?: number;
  generate_audio?: boolean;
}

export interface OpenRouterFrameImage {
  type: 'image_url';
  image_url: { url: string };
  frame_type: 'first_frame' | 'last_frame';
}

export interface VideoJobResult {
  id: string;
  polling_url: string;
}

export interface VideoJobStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'queued' | 'running' | 'processing' | 'cancelled' | 'expired';
  unsigned_urls?: string[];
  generation_id?: string;
  error?: string;
  usage?: {
    cost?: number;
    [key: string]: unknown;
  };
}

export interface ImageGenerateOptions {
  resolution?: string;
  aspectRatio?: string;
  seed?: number;
  outputModalities?: string[];
}

export interface ImageGenerationResult {
  urls: string[];
  model: string;
  usage?: {
    cost?: number;
    [key: string]: unknown;
  };
}

export type AppConfig = {
  apiKey: string;
  generationMode: 'text' | 'i2v' | '';
  mediaType: MediaType | '';
  selectedModel: string;
  i2vSelectedModel: string;
  imgbbApiKey?: string;
  localFolder: string;
  // Per-tab model selections
  selectedModelT2I: string;
  selectedModelI2I: string;
  selectedModelI2V: string;
  selectedModelT2V: string;
  lang?: 'ru' | 'en';
};


// ---- Unified Generation History ----

export type GenMode = 'text-to-video' | 'text-to-image' | 'image-to-video' | 'image-to-image';

export interface GenerationHistoryItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: GenMode;
  model: string;
  prompt: string;
  status: string;
  jobId?: string;
  generationId?: string;
  error?: string;
  remoteUrls: string[];
  localPaths: string[];
  usage?: { cost?: number; [key: string]: unknown };
  resolution?: string;
  aspectRatio?: string;
  duration?: number;
  generateAudio?: boolean;
  seed?: number;
  firstFrame?: UploadedFrameImage;
  lastFrame?: UploadedFrameImage;
}

export interface UploadedFrameImage {
  frameType: 'first_frame' | 'last_frame';
  provider: 'catbox' | 'tmpfiles';
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface I2VGenerateInput {
  model: string;
  prompt: string;
  firstFramePath: string;
  lastFramePath?: string;
  resolution?: string;
  aspectRatio?: string;
  duration?: number;
  generateAudio?: boolean;
  seed?: number;
}

export interface OpenRouterCredits {
  total_credits: number;
  total_usage: number;
}

export type IpcChannelMap = {
  'config:get': { args: []; return: IpcResult<AppConfig> };
  'config:set': { args: [config: Partial<AppConfig>]; return: IpcResult<void> };
  'models:fetch': { args: [mediaType: MediaType]; return: IpcResult<OpenRouterModel[]> };
  'video:generate': { args: [params: VideoGenerateParams]; return: IpcResult<VideoJobResult> };
  'video:poll': { args: [pollingUrl: string]; return: IpcResult<VideoJobStatus> };
  'image:generate': { args: [prompt: string, imageUrl?: string, options?: ImageGenerateOptions]; return: IpcResult<ImageGenerationResult> };
  'i2v:get-models': { args: []; return: IpcResult<OpenRouterModel[]> };
  'i2v:generate': { args: [input: I2VGenerateInput]; return: IpcResult<VideoJobResult> };
  'i2v:poll': { args: [jobId: string]; return: IpcResult<VideoJobStatus> };
  'i2v:download': { args: [jobId: string, outputPath: string]; return: IpcResult<string> };
  'video:download': { args: [jobId: string, outputPath: string]; return: IpcResult<string> };
  'credits:fetch': { args: []; return: IpcResult<OpenRouterCredits> };
  'history:list': { args: []; return: IpcResult<GenerationHistoryItem[]> };
  'history:delete': { args: [id: string]; return: IpcResult<void> };
  'dialog:open-file': { args: []; return: IpcResult<string | null> };
  'dialog:save-file': { args: [defaultName: string]; return: IpcResult<string | null> };
  'dialog:open-directory': { args: []; return: IpcResult<string | null> };
  'file:open': { args: [filePath: string]; return: IpcResult<void> };
  'file:show-in-folder': { args: [filePath: string]; return: IpcResult<void> };
  'config:test-connection': { args: [apiKey: string]; return: IpcResult<boolean> };
};
