/**
 * Browser console tool for measuring PNG frame photo slots
 *
 * Usage:
 * 1. Open browser console in dev environment
 * 2. Import and run: measureFrameSlots('/assets/frame-classic-vertical.png')
 * 3. Click to mark top-left and bottom-right corners of each photo slot
 * 4. After 6 clicks (2 corners × 3 slots), coordinates are logged to console
 * 5. Copy output to frame-config.ts
 */

export function measureFrameSlots(imagePath: string, slotCount = 3): void {
  const totalClicks = slotCount * 2;
  const img = new Image();

  img.onerror = () => {
    // Ignore error
  };

  img.onload = () => {
    // Create overlay
    const overlay = document.createElement('div');
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
      text-align: center;
    `;
    instructions.innerHTML = `
      <strong>Frame Slot Measurement Tool</strong><br/>
      Click ${totalClicks} times to mark ${slotCount} photo slot${slotCount > 1 ? 's' : ''}.<br/>
      Each slot needs top-left and bottom-right points.<br/>
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

    canvas.addEventListener('click', (e) => {
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
          y - prevMarker.y
        );
      }

      // Update counter
      const counter = document.getElementById('click-counter');
      if (counter) {
        counter.textContent = `Clicks: ${markers.length}/${totalClicks}`;
      }

      // Finished measurement
      if (markers.length === totalClicks) {
        const slots = [];
        for (let i = 0; i < markers.length; i += 2) {
          const topLeft = markers[i];
          const bottomRight = markers[i + 1];
          slots.push({
            x: Math.min(topLeft.x, bottomRight.x),
            y: Math.min(topLeft.y, bottomRight.y),
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(bottomRight.y - topLeft.y),
          });
        }

        console.log('photoSlots:', JSON.stringify(slots, null, 2));
        console.log('Use these values in app/lib/frame-config.ts under photoSlots');

        const doneText = document.createElement('div');
        doneText.style.cssText = `
          color: white;
          font-family: monospace;
          font-size: 16px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.75);
          border-radius: 8px;
          margin-top: 12px;
        `;
        doneText.textContent = 'Measurement complete. Check the browser console for coordinates.';
        overlay.appendChild(doneText);

        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
        }, 4000);
      }
    });

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
