/**
 * Analyze a PNG frame image to detect photo slot areas
 * Photo slots are typically white/light areas within the frame
 */
import { readFileSync, writeFileSync } from 'fs';
import zlib from 'zlib';

function analyzePng(filePath, outputPath) {
  const data = readFileSync(filePath);

  // Parse PNG chunks
  let offset = 8; // Skip PNG signature
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
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

  console.log(`Image: ${width}x${height}, bitDepth: ${bitDepth}, colorType: ${colorType}`);

  // Decompress IDAT
  const rawData = zlib.inflateSync(idat);

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bytesPerPixel = (channels * bitDepth) / 8;
  const stride = width * bytesPerPixel;

  // Unfilter each row
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
        case 0: // None
          result = raw;
          break;
        case 1: // Sub
          result = raw + (i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0);
          break;
        case 2: // Up
          result = raw + (y > 0 ? prevRow[i] : 0);
          break;
        case 3: // Average
          result = raw + Math.floor(
            (i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0) +
            (y > 0 ? prevRow[i] : 0)
          ) / 2;
          break;
        case 4: // Paeth
          const a = i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0;
          const b = y > 0 ? prevRow[i] : 0;
          const c = (i >= bytesPerPixel && y > 0) ? prevRow[i - bytesPerPixel] : 0;
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          result = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        default:
          result = raw;
      }

      pixelData[rowStart + i] = result & 0xff;
    }

    prevRow = pixelData.subarray(rowStart, rowStart + stride);
  }

  // Detect white/light regions (photo slots)
  // A photo slot area is typically a large contiguous region of white/near-white pixels
  const isWhite = (x, y) => {
    const idx = y * stride + x * bytesPerPixel;
    if (colorType === 6) {
      const alpha = pixelData[idx + 3];
      if (alpha < 128) return false; // Transparent
      return (
        pixelData[idx] > 220 &&
        pixelData[idx + 1] > 220 &&
        pixelData[idx + 2] > 220
      );
    } else if (colorType === 2) {
      return (
        pixelData[idx] > 220 &&
        pixelData[idx + 1] > 220 &&
        pixelData[idx + 2] > 220
      );
    } else {
      return pixelData[idx] > 220;
    }
  };

  // Build a low-res white map (sample every 4 pixels)
  const scale = 4;
  const mapW = Math.ceil(width / scale);
  const mapH = Math.ceil(height / scale);
  const whiteMap = new Uint8Array(mapW * mapH);

  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const px = x * scale;
      const py = y * scale;
      // Check a 2x2 sample
      let whiteCount = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          if (px + dx < width && py + dy < height && isWhite(px + dx, py + dy)) {
            whiteCount++;
          }
        }
      }
      whiteMap[y * mapW + x] = whiteCount >= 8 ? 1 : 0;
    }
  }

  // Find connected regions of white in the map
  const visited = new Uint8Array(mapW * mapH);
  const regions = [];

  const floodFill = (startX, startY) => {
    const queue = [[startX, startY]];
    visited[startY * mapW + startX] = 1;
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let count = 0;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      count++;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      // Check 4 neighbors (8-connected for robustness)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < mapW && ny >= 0 && ny < mapH) {
            if (!visited[ny * mapW + nx] && whiteMap[ny * mapW + nx] === 1) {
              visited[ny * mapW + nx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    return { minX, maxX, minY, maxY, count };
  };

  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      if (whiteMap[y * mapW + x] === 1 && !visited[y * mapW + x]) {
        const region = floodFill(x, y);
        if (region.count > 50) { // Only consider large regions
          regions.push(region);
        }
      }
    }
  }

  console.log(`\nFound ${regions.length} white regions (potential photo slots):`);
  console.log('='.repeat(70));

  regions.sort((a, b) => a.minY - b.minY);

  regions.forEach((region, i) => {
    const x = region.minX * scale;
    const y = region.minY * scale;
    const w = (region.maxX - region.minX + 1) * scale;
    const h = (region.maxY - region.minY + 1) * scale;
    const area = region.count * scale * scale;
    const percent = ((area / (width * height)) * 100).toFixed(1);
    console.log(`Region ${i + 1}: x=${x}, y=${y}, width=${w}, height=${h}, area=${area}px² (${percent}%)`);
    console.log(`  photoSlots entry: { x: ${x}, y: ${y}, width: ${w}, height: ${h} },`);
  });

  // Also create a visualization using PPM format (easy to check)
  if (outputPath) {
    // Create PPM P6 binary
    const ppm = Buffer.alloc(3 * mapW * mapH);
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const idx = (y * mapW + x) * 3;
        if (whiteMap[y * mapW + x] === 1) {
          ppm[idx] = 255;
          ppm[idx + 1] = 255;
          ppm[idx + 2] = 255;
        } else {
          ppm[idx] = 0;
          ppm[idx + 1] = 0;
          ppm[idx + 2] = 0;
        }
      }
    }
    const header = Buffer.from(`P6\n${mapW} ${mapH}\n255\n`);
    writeFileSync(outputPath, Buffer.concat([header, ppm]));
    console.log(`\nVisualization saved to ${outputPath}`);
  }
}

// Run
const filePath = process.argv[2];
const outputPath = process.argv[3];
if (!filePath) {
  console.error('Usage: node analyze-frame.js <png-file> [output.ppm]');
  process.exit(1);
}
analyzePng(filePath, outputPath);