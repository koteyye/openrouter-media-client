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
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length?: number;
  supported_resolutions?: string[];
  supported_aspect_ratios?: string[];
  supported_sizes?: string[];
  pricing_skus?: Record<string, string>;
  allowed_passthrough_parameters?: string[];
}

export interface VideoGenerateParams {
  prompt: string;
  resolution?: string;
  aspect_ratio?: string;
  size?: string;
  duration?: number;
  seed?: number;
  generate_audio?: boolean;
}

export interface VideoJobResult {
  id: string;
  polling_url: string;
}

export interface VideoJobStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  unsigned_urls?: string[];
  error?: string;
}

export type AppConfig = {
  apiKey: string;
  mediaType: MediaType | '';
  selectedModel: string;
};

export type IpcChannelMap = {
  'config:get': { args: []; return: IpcResult<AppConfig> };
  'config:set': { args: [config: Partial<AppConfig>]; return: IpcResult<void> };
  'models:fetch': { args: [mediaType: MediaType]; return: IpcResult<OpenRouterModel[]> };
  'video:generate': { args: [params: VideoGenerateParams]; return: IpcResult<VideoJobResult> };
  'video:poll': { args: [pollingUrl: string]; return: IpcResult<VideoJobStatus> };
};
