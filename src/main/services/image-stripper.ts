import sharp from 'sharp';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export async function stripMetadata(inputPath: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `cleaned-${randomUUID()}.jpg`);

  try {
    await sharp(inputPath)
      .rotate()
      .toFormat('jpeg', { quality: 85 })
      .toFile(outputPath);

    return outputPath;
  } catch (err) {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw new Error(`Failed to strip metadata: ${(err as Error).message}`);
  }
}
