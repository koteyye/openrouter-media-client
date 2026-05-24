import fs from 'fs';
import path from 'path';

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

export function validateImage(filePath: string): ImageValidationResult {
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist', mimeType: '', sizeBytes: 0, fileName };
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return { valid: false, error: 'File is empty', mimeType: '', sizeBytes: 0, fileName };
  }

  if (stat.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum: 20 MB`,
      mimeType: '',
      sizeBytes: stat.size,
      fileName,
    };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format: ${ext}. Use PNG, JPG, JPEG, or WEBP`,
      mimeType: '',
      sizeBytes: stat.size,
      fileName,
    };
  }

  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  return { valid: true, mimeType: mimeMap[ext], sizeBytes: stat.size, fileName };
}
