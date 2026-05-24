import { validateImage } from './image-validator';
import { stripMetadata } from './image-stripper';
import { uploadToTmpfiles } from './tmpfiles';
import { verifyPublicImageUrl } from './url-verifier';
import fs from 'fs';
import type { UploadedFrameImage } from '../../shared/ipc-types';

export async function uploadFrameImage(filePath: string, imgbbApiKey?: string): Promise<UploadedFrameImage> {
  console.log("[i2v-uploader] Validating image...", filePath);
  const validation = validateImage(filePath);
  if (!validation.valid) throw new Error(validation.error);

  console.log("[i2v-uploader] Stripping metadata...");
  const cleanedPath = await stripMetadata(filePath);
  let url: string;

  try {
    console.log("[i2v-uploader] Uploading image to cloud...");
    url = await uploadToTmpfiles(cleanedPath, imgbbApiKey);
    console.log("[i2v-uploader] Uploaded URL:", url);
  } finally {
    if (fs.existsSync(cleanedPath)) fs.unlinkSync(cleanedPath);
  }

  console.log("[i2v-uploader] Verifying URL availability...");
  await verifyPublicImageUrl(url);
  console.log("[i2v-uploader] Verified successfully!");

  return {
    frameType: 'first_frame',
    provider: imgbbApiKey ? 'catbox' : 'tmpfiles', // Use 'catbox' for type compatibility with shared types
    url,
    originalFileName: validation.fileName,
    mimeType: validation.mimeType,
    sizeBytes: validation.sizeBytes,
    uploadedAt: new Date().toISOString(),
  };
}
