/**
 * Detect actual photo slot areas in a frame by finding large uniform (low-variance) regions
 */
import { readFileSync } from 'fs';
import zlib from 'zlib';

function analyze(filePath) {
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
      }
      pixelData[rowStart + i] = result & 0xff;
    }
    prevRow = pixelData.subarray(rowStart, rowStart + stride);
  }

  const getPixel = (x, y) => {
    const idx = y * stride + x * bytesPerPixel;
    if (colorType === 6) return [pixelData[idx], pixelData[idx + 1], pixelData[idx + 2], pixelData[idx + 3]];
    return [pixelData[idx], pixelData[idx + 1], pixelData[idx + 2], 255];
  };

  // Analyze each row: compute average brightness and variance
  console.log('=== ROW ANALYSIS (brightness, variance, classification) ===');
  const rowStats = [];
  for (let y = 0; y < height; y += 2) {
    let sum = 0, sumSq = 0, count = 0;
    let whiteCount = 0;
    for (let x = 0; x < width; x += 4) {
      const [r, g, b, a] = getPixel(x, y);
      if (a < 100) continue;
      const lum = (r + g + b) / 3;
      sum += lum;
      sumSq += lum * lum;
      count++;
      if (r > 235 && g > 235 && b > 235) whiteCount++;
    }
    if (count > 0) {
      const avg = sum / count;
      const variance = sumSq / count - avg * avg;
      const whitePct = (whiteCount / count) * 100;
      rowStats.push({ y, avg, variance, whitePct });
    }
  }

  // Print summary every 20 rows
  for (let i = 0; i < rowStats.length; i += 10) {
    const s = rowStats[i];
    const bar = '█'.repeat(Math.round(s.avg / 10));
    const varBar = '░'.repeat(Math.min(20, Math.round(s.variance / 100)));
    console.log(`y=${String(s.y).padStart(5)}: avg=${String(Math.round(s.avg)).padStart(3)} var=${String(Math.round(s.variance)).padStart(5)} white=${String(Math.round(s.whitePct)).padStart(3)}% ${bar}${varBar}`);
  }

  // Find "photo slot" regions: rows where whitePct > 80% AND variance < 500 (uniform white)
  console.log('\n=== PHOTO SLOT REGIONS (uniform white areas) ===');
  const isSlotRow = (s) => s.whitePct > 80 && s.variance < 800;
  
  let inSlot = false;
  let slotStart = 0;
  const slots = [];
  for (const s of rowStats) {
    const isSlot = isSlotRow(s);
    if (isSlot && !inSlot) { inSlot = true; slotStart = s.y; }
    if (!isSlot && inSlot) {
      inSlot = false;
      if (s.y - slotStart > 30) slots.push({ yStart: slotStart, yEnd: s.y });
    }
  }
  if (inSlot) slots.push({ yStart: slotStart, yEnd: height });

  slots.forEach((s, i) => {
    // Find exact x bounds for this slot at its middle
    const midY = Math.floor((s.yStart + s.yEnd) / 2);
    let xStart = -1, xEnd = -1;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, midY);
      if (a > 100 && r > 235 && g > 235 && b > 235) { xStart = x; break; }
    }
    for (let x = width - 1; x >= 0; x--) {
      const [r, g, b, a] = getPixel(x, midY);
      if (a > 100 && r > 235 && g > 235 && b > 235) { xEnd = x; break; }
    }
    console.log(`Slot ${i + 1}: y=${s.yStart}-${s.yEnd} (h=${s.yEnd - s.yStart}), x=${xStart}-${xEnd} (w=${xEnd - xStart + 1})`);
    console.log(`  => { x: ${xStart}, y: ${s.yStart}, width: ${xEnd - xStart + 1}, height: ${s.yEnd - s.yStart} },`);
  });

  // Also check for large uniform regions that might not be pure white (e.g., light gray)
  console.log('\n=== LARGE UNIFORM REGIONS (any light color, low variance) ===');
  const isUniformRow = (s) => s.avg > 180 && s.variance < 1500;
  
  inSlot = false;
  slotStart = 0;
  const uniformSlots = [];
  for (const s of rowStats) {
    const isU = isUniformRow(s);
    if (isU && !inSlot) { inSlot = true; slotStart = s.y; }
    if (!isU && inSlot) {
      inSlot = false;
      if (s.y - slotStart > 30) uniformSlots.push({ yStart: slotStart, yEnd: s.y });
    }
  }
  if (inSlot) uniformSlots.push({ yStart: slotStart, yEnd: height });

  uniformSlots.forEach((s, i) => {
    const midY = Math.floor((s.yStart + s.yEnd) / 2);
    let xStart = -1, xEnd = -1;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, midY);
      if (a > 100 && (r + g + b) / 3 > 180) { xStart = x; break; }
    }
    for (let x = width - 1; x >= 0; x--) {
      const [r, g, b, a] = getPixel(x, midY);
      if (a > 100 && (r + g + b) / 3 > 180) { xEnd = x; break; }
    }
    console.log(`Region ${i + 1}: y=${s.yStart}-${s.yEnd} (h=${s.yEnd - s.yStart}), x=${xStart}-${xEnd} (w=${xEnd - xStart + 1})`);
  });
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node detect-slots.js <png-file>');
  process.exit(1);
}
analyze(filePath);