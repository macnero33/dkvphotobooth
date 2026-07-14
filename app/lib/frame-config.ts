/**
 * Frame configuration system for photobooth
 * Defines frame templates with photo slot coordinates
 */

export interface PhotoSlot {
  x: number; // Top-left X coordinate
  y: number; // Top-left Y coordinate
  width: number; // Slot width
  height: number; // Slot height
}

export interface FrameConfig {
  id: string; // Unique identifier
  name: string; // Display name
  path: string; // Asset path
  width: number; // Frame width
  height: number; // Frame height
  orientation: 'vertical' | 'horizontal';
  photoSlots: PhotoSlot[]; // One or more photo slots
  description?: string; // Optional frame description for UI
  isDefault?: boolean; // Default selection flag
}

export type FrameOrientation = 'vertical' | 'horizontal';

/**
 * Frame configurations
 * NOTE: Photo slot coordinates are estimated and need verification
 * TODO: Measure exact coordinates using image editor or measurement tool
 */
export const FRAME_CONFIGS: Record<string, FrameConfig> = {
  'classic-vertical': {
    id: 'classic-vertical',
    name: 'Classic',
    path: '/assets/frame-classic-vertical.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    isDefault: true,
    photoSlots: [
      // Sized to match ifta.png reference (1181x1772)
      { x: 115, y: 70, width: 951, height: 510 },
      { x: 115, y: 631, width: 951, height: 510 },
      { x: 115, y: 1192, width: 951, height: 510 },
    ],
  },
  ifta: {
    id: 'ifta',
    name: 'My New Frame',
    path: '/assets/ifta.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    photoSlots: [
  { x: 105, y: 238, width: 973, height: 859 }, // Slot 1
],
  },
  'bright-bold-vertical': {
    id: 'bright-bold-vertical',
    name: 'Bright & Bold',
    path: '/assets/frame-bright-and-bold-vertical.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    photoSlots: [
      // Sized to match ifta.png reference (1181x1772)
      { x: 115, y: 70, width: 951, height: 510 },
      { x: 115, y: 631, width: 951, height: 510 },
      { x: 115, y: 1192, width: 951, height: 510 },
    ],
  },
  'elegant-horizontal': {
    id: 'elegant-horizontal',
    name: 'Elegant',
    path: '/assets/frame-elegant-horizontal.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    photoSlots: [
      // Sized to match ifta.png reference (1181x1772)
      { x: 115, y: 70, width: 951, height: 510 },
      { x: 115, y: 631, width: 951, height: 510 },
      { x: 115, y: 1192, width: 951, height: 510 },
    ],
  },
  'modern-horizontal': {
    id: 'modern-horizontal',
    name: 'Modern',
    path: '/assets/frame-modern-horizontal.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    photoSlots: [
      // Sized to match ifta.png reference (1181x1772)
      { x: 115, y: 70, width: 951, height: 510 },
      { x: 115, y: 631, width: 951, height: 510 },
      { x: 115, y: 1192, width: 951, height: 510 },
    ],
  },
};

/**
 * Get the default frame configuration
 */
export function getDefaultFrame(): FrameConfig {
  return (
    Object.values(FRAME_CONFIGS).find((f) => f.isDefault) ||
    FRAME_CONFIGS['classic-vertical']
  );
}

/**
 * Get frame configuration by ID
 */
export function getFrameById(id: string): FrameConfig | undefined {
  return FRAME_CONFIGS[id];
}

/**
 * Get all frames filtered by orientation
 */
export function getFramesByOrientation(
  orientation: FrameOrientation,
): FrameConfig[] {
  return Object.values(FRAME_CONFIGS).filter(
    (f) => f.orientation === orientation,
  );
}

/**
 * Get all available frames
 */
export function getAllFrames(): FrameConfig[] {
  return Object.values(FRAME_CONFIGS);
}
