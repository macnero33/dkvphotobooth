/**
 * Browser console tool for measuring PNG frame photo slots
 *
 * Usage:
 * 1. Open browser console in dev environment
 * 2. Import and run: measureFrameSlots('/assets/frame-classic-vertical.png', 3)
 *    - slotCount: 1, 2, or 3 (default: 3)
 * 3. Click to mark top-left and bottom-right corners of each photo slot
 * 4. After all clicks (2 × slotCount), coordinates are logged to console
 * 5. Copy output to frame-config.ts
 *
 * Or use the in-page tool at /measure-frames which provides a slot-count selector.
 */

export function measureFrameSlots(
  imagePath: string,
  slotCount: 1 | 2 | 3 = 3,
): void {
  const img = new Image();

  img.onerror = () => {
    // Ignore error
  };

  img.onload = () => {
    const totalClicks = slotCount * 2;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'measure-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9999;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
    `;

    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      color: white;
      font-family: monospace;
      font-size: 14px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      max-width: 600px;
    `;
    instructions.innerHTML = `
      <strong>Frame Slot Measurement Tool</strong><br/>
      Click ${totalClicks} times to mark ${slotCount} photo slot${slotCount > 1 ? 's' : ''} (top-left, bottom-right for each slot)<br/>
      <span id="click-counter">Clicks: 0/${totalClicks}</span>
    `;

    // Canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      max-width: 90vw;
      max-height: 80vh;
      overflow: auto;
      background: #fff;
      padding: 8px;
      border-radius: 4px;
    `;

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.cursor = 'crosshair';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const markers: Array<{ x: number; y: number }> = [];

    const finishMeasurement = () => {
      // Build photoSlots array from pairs of markers
      const photoSlots: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      for (let i = 0; i < markers.length; i += 2) {
        photoSlots.push({
          x: markers[i].x,
          y: markers[i].y,
          width: markers[i + 1].x - markers[i].x,
          height: markers[i + 1].y - markers[i].y,
        });
      }

      const output = `photoSlots: [\n${photoSlots
        .map(
          (slot, i) =>
            `  { x: ${slot.x}, y: ${slot.y}, width: ${slot.width}, height: ${slot.height} }, // Slot ${i + 1}`,
        )
        .join('\n')}\n],`;

      // eslint-disable-next-line no-console
      console.log(
        '%cMeasured photoSlots for ' + imagePath,
        'color: #00FF00; font-weight: bold; font-size: 14px;',
      );
      // eslint-disable-next-line no-console
      console.log(output);

      // Show output in the overlay
      const resultBox = document.createElement('div');
      resultBox.style.cssText = `
        color: #0f0;
        font-family: monospace;
        font-size: 13px;
        padding: 16px;
        background: #222;
        border-radius: 8px;
        max-width: 600px;
        white-space: pre;
        overflow: auto;
      `;
      resultBox.textContent = output;
      overlay.appendChild(resultBox);

      // Disable further clicks
      canvas.style.cursor = 'default';
      canvas.removeEventListener('click', handleClick);

      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close (or wait 8s)';
      closeBtn.style.cssText = `
        padding: 8px 16px;
        background: #fff;
        color: #000;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: monospace;
        font-size: 14px;
      `;
      closeBtn.onclick = () => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      };
      overlay.appendChild(closeBtn);

      // Cleanup after delay
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 8000);
    };

    const handleClick = (e: MouseEvent) => {
      // Stop after we have enough markers
      if (markers.length >= totalClicks) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      markers.push({ x, y });

      // Draw marker
      ctx.fillStyle = markers.length % 2 === 1 ? '#00FF00' : '#FF0000';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.font = 'bold 16px monospace';
      const text = `${markers.length}: (${x}, ${y})`;
      ctx.strokeText(text, x + 10, y);
      ctx.fillText(text, x + 10, y);

      // Draw connecting line for slot pairs
      if (markers.length % 2 === 0) {
        const prevMarker = markers[markers.length - 2];
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          prevMarker.x,
          prevMarker.y,
          x - prevMarker.x,
          y - prevMarker.y,
        );
      }

      // Update counter
      const counter = document.getElementById('click-counter');
      if (counter) {
        counter.textContent = `Clicks: ${markers.length}/${totalClicks} (Slot ${Math.floor((markers.length - 1) / 2) + 1})`;
      }

      // Once we hit the required clicks, finish
      if (markers.length === totalClicks) {
        finishMeasurement();
      }
    };

    canvas.addEventListener('click', handleClick);

    canvasContainer.appendChild(canvas);
    overlay.appendChild(instructions);
    overlay.appendChild(canvasContainer);
    document.body.appendChild(overlay);
  };

  img.src = imagePath;
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).measureFrameSlots = measureFrameSlots;
}
