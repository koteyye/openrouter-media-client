import type { OpenRouterModel, VideoGenerateParams, VideoJobResult, VideoJobStatus } from '../shared/ipc-types';

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
  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
  };

  if (params.resolution) body.resolution = params.resolution;
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.size) body.size = params.size;
  if (params.duration !== undefined && params.duration > 0) body.duration = params.duration;
  if (params.seed !== undefined) body.seed = params.seed;
  if (params.generate_audio !== undefined) body.generate_audio = params.generate_audio;

  const res = await fetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`Video generation request failed: ${res.status} - ${bodyText}`);
  }

  const json = await res.json();
  return {
    id: json.id,
    polling_url: json.polling_url,
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
    const bodyText = await res.text();
    throw new Error(`Polling failed: ${res.status} - ${bodyText}`);
  }

  return (await res.json()) as VideoJobStatus;
}
