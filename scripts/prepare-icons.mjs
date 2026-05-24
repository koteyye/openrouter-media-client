import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceIcon = path.resolve('src/assets/icons/openrouter_media_client_windows_ico.ico');
const outputDir = path.resolve('build');
const outputPng = path.join(outputDir, 'icon.png');
const outputIcns = path.join(outputDir, 'icon.icns');

function readIcoImages(buffer) {
  if (buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) {
    throw new Error('Unsupported ICO header');
  }

  const count = buffer.readUInt16LE(4);
  const images = [];

  for (let i = 0; i < count; i += 1) {
    const entryOffset = 6 + i * 16;
    const width = buffer[entryOffset] || 256;
    const height = buffer[entryOffset + 1] || 256;
    const size = buffer.readUInt32LE(entryOffset + 8);
    const offset = buffer.readUInt32LE(entryOffset + 12);
    images.push({
      width,
      height,
      data: buffer.subarray(offset, offset + size),
    });
  }

  return images;
}

async function icoImageToPng(image) {
  const data = image.data;
  const pngSignature = '89504e470d0a1a0a';
  if (data.subarray(0, 8).toString('hex') === pngSignature) {
    return sharp(data).resize(1024, 1024, { fit: 'contain' }).png().toBuffer();
  }

  const dibHeaderSize = data.readUInt32LE(0);
  const width = data.readInt32LE(4);
  const storedHeight = data.readInt32LE(8);
  const bitDepth = data.readUInt16LE(14);
  const compression = data.readUInt32LE(16);
  const height = Math.abs(storedHeight) / 2;

  if (dibHeaderSize !== 40 || bitDepth !== 32 || compression !== 0 || width <= 0 || height <= 0) {
    throw new Error(`Unsupported ICO bitmap: ${width}x${height}, ${bitDepth}bit, compression ${compression}`);
  }

  const bitmapOffset = dibHeaderSize;
  const raw = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = bitmapOffset + (sourceY * width + x) * 4;
      const targetIndex = (y * width + x) * 4;
      raw[targetIndex] = data[sourceIndex + 2];
      raw[targetIndex + 1] = data[sourceIndex + 1];
      raw[targetIndex + 2] = data[sourceIndex];
      raw[targetIndex + 3] = data[sourceIndex + 3];
    }
  }

  return sharp(raw, { raw: { width, height, channels: 4 } })
    .resize(1024, 1024, { fit: 'contain' })
    .png()
    .toBuffer();
}

function makeIcnsEntry(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
}

function makeIcns(entries) {
  const body = Buffer.concat(entries);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([header, body]);
}

async function main() {
  const ico = fs.readFileSync(sourceIcon);
  const images = readIcoImages(ico);
  const largest = images.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  if (!largest) throw new Error('ICO file does not contain images');

  fs.mkdirSync(outputDir, { recursive: true });

  const basePng = await icoImageToPng(largest);
  await sharp(basePng).resize(256, 256, { fit: 'contain' }).png().toFile(outputPng);

  const ic08 = await sharp(basePng).resize(256, 256, { fit: 'contain' }).png().toBuffer();
  const ic09 = await sharp(basePng).resize(512, 512, { fit: 'contain' }).png().toBuffer();
  const ic10 = await sharp(basePng).resize(1024, 1024, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(outputIcns, makeIcns([
    makeIcnsEntry('ic08', ic08),
    makeIcnsEntry('ic09', ic09),
    makeIcnsEntry('ic10', ic10),
  ]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
