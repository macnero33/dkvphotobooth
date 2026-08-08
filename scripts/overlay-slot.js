/**
 * Overlay a rectangle outline (photo slot) on a PNG for visual verification.
 * Usage: node overlay-slot.js <png-file> <x> <y> <width> <height> <output.ppm>
 */
import { readFileSync, writeFileSync } from 'fs';
import zlib from 'zlib';

function decodePng(filePath) {
  const data = readFileSync(filePath);
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  let idat = Buffer.alloc(0);

  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunkData = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
    } else if (type === 'IDAT') {
      idat = Buffer.concat([idat, chunkData]);
    }
    offset += 12 + length;
  }

  const rawData = zlib.inflateSync(idat);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bytesPerPixel = (channels * bitDepth) / 8;
  const stride = width * bytesPerPixel;
  const pixelData = Buffer.alloc(height * stride);
  let prevRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filterType = rawData[y * (stride + 1)];
    const rowStart = y * stride;
    const rawRowStart = y * (stride + 1) + 1;
    const row = rawData.subarray(rawRowStart, rawRowStart + stride);
    for (let i = 0; i < stride; i++) {
      const raw = row[i];
      let result;
      switch (filterType) {
        case 0: result = raw; break;
        case 1: result = raw + (i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0); break;
        case 2: result = raw + (y > 0 ? prevRow[i] : 0); break;
        case 3: result = raw + Math.floor(((i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0) + (y > 0 ? prevRow[i] : 0)) / 2); break;
        case 4: {
          const a = i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0;
          const b = y > 0 ? prevRow[i] : 0;
          const c = (i >= bytesPerPixel && y > 0) ? prevRow[i - bytesPerPixel] : 0;
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          result = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: result = raw;
      }
      pixelData[rowStart + i] = result & 0xff;
    }
    prevRow = pixelData.subarray(rowStart, rowStart + stride);
  }

  return { width, height, bytesPerPixel, stride, pixelData, colorType };
}

const [filePath, xs, ys, ws, hs, outPath] = process.argv.slice(2);
if (!filePath || !outPath) {
  console.error('Usage: node overlay-slot.js <png-file> <x> <y> <width> <height> <output.ppm>');
  process.exit(1);
}
const x = parseInt(xs, 10), y = parseInt(ys, 10), w = parseInt(ws, 10), h = parseInt(hs, 10);
const { width, height, bytesPerPixel, stride, pixelData, colorType } = decodePng(filePath);

const getRGB = (px, py) => {
  const idx = py * stride + px * bytesPerPixel;
  return [pixelData[idx], pixelData[idx + 1], pixelData[idx + 2]];
};

const ppm = Buffer.alloc(3 * width * height);
for (let py = 0; py < height; py++) {
  for (let px = 0; px < width; px++) {
    const idx = (py * width + px) * 3;
    let [r, g, b] = getRGB(px, py);
    if (colorType === 6) {
      const aIdx = py * stride + px * bytesPerPixel + 3;
      const alpha = pixelData[aIdx];
      if (alpha < 128) { r = 255; g = 255; b = 255; }
    }
    ppm[idx] = r; ppm[idx + 1] = g; ppm[idx + 2] = b;
  }
}

const thickness = 4;
const drawPixel = (px, py, r, g, b) => {
  if (px < 0 || px >= width || py < 0 || py >= height) return;
  const idx = (py * width + px) * 3;
  ppm[idx] = r; ppm[idx + 1] = g; ppm[idx + 2] = b;
};
for (let t = 0; t < thickness; t++) {
  for (let px = x; px < x + w; px++) {
    drawPixel(px, y + t, 255, 0, 0);
    drawPixel(px, y + h - 1 - t, 255, 0, 0);
  }
  for (let py = y; py < y + h; py++) {
    drawPixel(x + t, py, 255, 0, 0);
    drawPixel(x + w - 1 - t, py, 255, 0, 0);
  }
}

const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
writeFileSync(outPath, Buffer.concat([header, ppm]));
console.log(`Saved overlay to ${outPath} (rect x=${x} y=${y} w=${w} h=${h})`);
