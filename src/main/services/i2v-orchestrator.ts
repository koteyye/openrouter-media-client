import type { OpenRouterModel, VideoJobResult, VideoJobStatus, I2VGenerateInput } from '../../shared/ipc-types';
import { fetchVideoModels as fetchVidModels } from '../openrouter';
import { validateImage } from './image-validator';
import { stripMetadata } from './image-stripper';
import { uploadToTmpfiles } from './tmpfiles';
import { verifyPublicImageUrl } from './url-verifier';
import fs from 'fs';

const BASE_URL = 'https://openrouter.ai/api/v1';

export async function getI2VModels(apiKey: string): Promise<OpenRouterModel[]> {
  const models = await fetchVidModels(apiKey);
  return models.filter(
    (m) => m.supported_frame_images && m.supported_frame_images.includes('first_frame')
  );
}

export async function uploadFrameImage(
  filePath: string
): Promise<import('../../shared/ipc-types').UploadedFrameImage> {
  const validation = validateImage(filePath);
  if (!validation.valid) throw new Error(validation.error);

  const cleanedPath = await stripMetadata(filePath);
  let url: string;

  try {
    url = await uploadToTmpfiles(cleanedPath);
  } finally {
    if (fs.existsSync(cleanedPath)) fs.unlinkSync(cleanedPath);
  }

  await verifyPublicImageUrl(url);

  return {
    frameType: 'first_frame',
    provider: 'tmpfiles',
    url,
    originalFileName: validation.fileName,
    mimeType: validation.mimeType,
    sizeBytes: validation.sizeBytes,
    uploadedAt: new Date().toISOString(),
  };
}

export async function submitI2VJob(
  apiKey: string,
  input: I2VGenerateInput
): Promise<VideoJobResult> {
  if (!input.prompt || input.prompt.trim().length < 3) {
    throw new Error('Prompt must be at least 3 characters');
  }

  const body: Record<string, unknown> = {
    model: input.model,
    prompt: input.prompt,
    frame_images: [
      {
        type: 'image_url',
        image_url: { url: '' }, // will be filled by orchestration
        frame_type: 'first_frame',
      },
    ],
  };

  if (input.resolution) body.resolution = input.resolution;
  if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
  if (input.duration !== undefined && input.duration > 0) body.duration = input.duration;
  if (input.generateAudio !== undefined) body.generate_audio = input.generateAudio;
  if (input.seed !== undefined) body.seed = input.seed;

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

export async function pollI2VJob(apiKey: string, jobId: string): Promise<VideoJobStatus> {
  const res = await fetch(`${BASE_URL}/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polling failed: ${res.status} - ${text}`);
  }

  return (await res.json()) as VideoJobStatus;
}

export async function downloadVideo(
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
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}
