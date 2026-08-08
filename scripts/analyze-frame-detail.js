/**
 * Analyze frame image and produce ASCII art visualization + color regions
 */
import { readFileSync } from 'fs';
import zlib from 'zlib';

function analyzePng(filePath) {
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
        case 4:
          const a = i >= bytesPerPixel ? pixelData[rowStart + i - bytesPerPixel] : 0;
          const b = y > 0 ? prevRow[i] : 0;
          const c = (i >= bytesPerPixel && y > 0) ? prevRow[i - bytesPerPixel] : 0;
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          result = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        default: result = raw;
      }
      pixelData[rowStart + i] = result & 0xff;
    }
    prevRow = pixelData.subarray(rowStart, rowStart + stride);
  }

  const getPixel = (x, y) => {
    const idx = y * stride + x * bytesPerPixel;
    if (colorType === 6) return [pixelData[idx], pixelData[idx + 1], pixelData[idx + 2], pixelData[idx + 3]];
    if (colorType === 2) return [pixelData[idx], pixelData[idx + 1], pixelData[idx + 2], 255];
    const v = pixelData[idx];
    return [v, v, v, 255];
  };

  // Classify each pixel into categories
  const classify = (x, y) => {
    const [r, g, b, a] = getPixel(x, y);
    if (a < 128) return 'T'; // Transparent
    if (r > 235 && g > 235 && b > 235) return 'W'; // White / photo slot
    if (r < 60 && g > 100 && b < 100 && g > r + 40) return 'G'; // Green
    if (r > 200 && g < 150 && b < 150) return 'R'; // Red
    return 'O'; // Other (colored)
  };

  // Build ASCII visualization (downsampled to ~79 cols)
  const cols = 79;
  const rows = Math.floor(cols * height / width * 0.5); // half-height for aspect ratio
  const cellW = width / cols;
  const cellH = height / rows;

  console.log(`\n=== ASCII VISUALIZATION (${width}x${height}) ===`);
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < cols; rx++) {
      const px = Math.floor((rx + 0.5) * cellW);
      const py = Math.floor((ry + 0.5) * cellH);
      line += classify(px, py);
    }
    // Trim trailing O's? No, print full
    console.log(line);
  }

  // Find row transitions - detect horizontal bands
  console.log(`\n=== HORIZONTAL BAND ANALYSIS (sampling x=590) ===`);
  let currentClass = null;
  let startY = 0;
  const bands = [];
  for (let y = 0; y < height; y += 2) {
    const c = classify(590, y);
    if (c !== currentClass) {
      if (currentClass !== null) {
        bands.push({ cls: currentClass, yStart: startY, yEnd: y });
      }
      currentClass = c;
      startY = y;
    }
  }
  if (currentClass !== null) {
    bands.push({ cls: currentClass, yStart: startY, yEnd: height });
  }
  bands.forEach((b, i) => {
    console.log(`Band ${i}: [${b.cls}] y=${b.yStart} to ${b.yEnd} (h=${b.yEnd - b.yStart})`);
  });

  // Scan row at center of each white band to find exact white bounds
  console.log(`\n=== PHOTO SLOT DETECTION ===`);
  // Find white regions by scanning rows
  const isWhiteRow = (y) => {
    let count = 0;
    for (let x = 0; x < width; x += 10) {
      if (classify(x, y) === 'W') count++;
    }
    return count >= 5;
  };

  let inWhite = false;
  let slotStart = 0;
  const slots = [];
  for (let y = 0; y < height; y += 4) {
    const w = isWhiteRow(y);
    if (w && !inWhite) { inWhite = true; slotStart = y; }
    if (!w && inWhite) { inWhite = false; if (y - slotStart > 20) slots.push({ yStart: slotStart, yEnd: y }); }
  }
  if (inWhite) slots.push({ yStart: slotStart, yEnd: height });

  slots.forEach((s, i) => {
    // Find exact x bounds for this slot
    const midY = Math.floor((s.yStart + s.yEnd) / 2);
    let xStart = -1, xEnd = -1;
    for (let x = 0; x < width; x++) {
      if (classify(x, midY) === 'W') { xStart = x; break; }
    }
    for (let x = width - 1; x >= 0; x--) {
      if (classify(x, midY) === 'W') { xEnd = x; break; }
    }
    console.log(`Slot ${i + 1}: y=${s.yStart}-${s.yEnd} (h=${s.yEnd - s.yStart}), x=${xStart}-${xEnd} (w=${xEnd - xStart + 1})`);
    console.log(`  => { x: ${xStart}, y: ${s.yStart}, width: ${xEnd - xStart + 1}, height: ${s.yEnd - s.yStart} },`);
  });

  // Also check at different x positions for vertical boundaries of each slot
  console.log(`\n=== VERTICAL ANALYSIS PER SLOT ===`);
  for (const s of slots) {
    const midY = Math.floor((s.yStart + s.yEnd) / 2);
    // Check column classification to find left/right edges more precisely
    const isWhiteCol = (x) => {
      for (let y = s.yStart; y < s.yEnd; y += 20) {
        if (classify(x, y) !== 'W') return false;
      }
      return true;
    };
    let lx = -1;
    for (let x = 0; x < width; x++) {
      if (isWhiteCol(x)) { lx = x; break; }
    }
    let rx = -1;
    for (let x = width - 1; x >= 0; x--) {
      if (isWhiteCol(x)) { rx = x; break; }
    }
    console.log(`Slot y=${s.yStart}-${s.yEnd}: x from ${lx} to ${rx}`);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node analyze-frame-detail.js <png-file>');
  process.exit(1);
}
analyzePng(filePath);