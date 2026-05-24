import type { OpenRouterModel, VideoGenerateParams, VideoJobResult, VideoJobStatus, ImageGenerationResult } from '../shared/ipc-types';

const BASE_URL = 'https://openrouter.ai/api/v1';

export async function fetchImageModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE_URL}/models?output_modalities=image`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch image models: ${res.status} - ${body}`);
  }
  const json = await res.json();
  return (json.data ?? []) as OpenRouterModel[];
}

export async function fetchVideoModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE_URL}/videos/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch video models: ${res.status} - ${body}`);
  }
  const json = await res.json();
  return (json.data ?? []) as OpenRouterModel[];
}

export async function generateVideo(
  apiKey: string,
  model: string,
  params: VideoGenerateParams
): Promise<VideoJobResult> {
  const body: Record<string, unknown> = { model, prompt: params.prompt };
  if (params.resolution) body.resolution = params.resolution;
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.size) body.size = params.size;
  if (params.duration !== undefined && params.duration > 0) body.duration = params.duration;
  if (params.seed !== undefined) body.seed = params.seed;
  if (params.generate_audio !== undefined) {
    body.generate_audio = params.generate_audio;
  }
  if (params.frame_images) body.frame_images = params.frame_images;
  if (params.input_references) body.input_references = params.input_references;
  if (params.audio_ref) body.audio_ref = params.audio_ref;

  const res = await fetch(`${BASE_URL}/videos`, {
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
  return { id: json.id, polling_url: json.polling_url };
}

export async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  imageUrl?: string,
  options?: import('../shared/ipc-types').ImageGenerateOptions
): Promise<ImageGenerationResult> {
  const content = imageUrl
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    : prompt;

  // Определяем модальности: если модель поддерживает только image (например, Flux, Recraft)
  // то отправляем ['image'], иначе ['image', 'text']
  const outputModalities = options?.outputModalities ?? ['image', 'text'];

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content }],
    modalities: outputModalities,
  };

  if (options?.resolution || options?.aspectRatio || options?.seed !== undefined) {
    const imageConfig: Record<string, unknown> = {};
    if (options.resolution) imageConfig.image_size = options.resolution;
    if (options.aspectRatio) imageConfig.aspect_ratio = options.aspectRatio;
    if (options.seed !== undefined) imageConfig.seed = options.seed;
    body.image_config = imageConfig;
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image generation request failed: ${res.status} - ${text}`);
  }
  const json = await res.json();

  const urls: string[] = [];
  const message = json.choices?.[0]?.message;
  if (message) {
    // Новый формат: message.images
    if (Array.isArray(message.images)) {
      for (const img of message.images) {
        const url = img?.image_url?.url || img?.imageUrl?.url;
        if (url) urls.push(url);
      }
    }
    // Резервный формат: message.content как массив с image_url
    if (urls.length === 0 && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          urls.push(part.image_url.url);
        }
      }
    }
  }

  return {
    urls,
    model: json.model ?? model,
    usage: json.usage,
  };
}

export async function fetchCredits(apiKey: string): Promise<{ total_credits: number; total_usage: number }> {
  const res = await fetch(`${BASE_URL}/credits`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch credits: ${res.status} - ${body}`);
  }
  const json = await res.json();
  const data = json.data ?? {};
  return {
    total_credits: data.total_credits ?? 0,
    total_usage: data.total_usage ?? 0,
  };
}

export async function pollVideoStatus(
  apiKey: string,
  pollingUrl: string
): Promise<VideoJobStatus> {
  const res = await fetch(pollingUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polling failed: ${res.status} - ${text}`);
  }
  return (await res.json()) as VideoJobStatus;
}

export async function downloadVideoContent(
  apiKey: string,
  jobId: string,
  outputPath: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/videos/${jobId}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed: ${res.status} - ${text}`);
  }
  const buffer = await res.arrayBuffer();
  const fs = await import('fs');
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}
