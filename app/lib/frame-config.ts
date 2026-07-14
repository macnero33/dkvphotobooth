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
  orientation: 'vertical';
  photoSlots: PhotoSlot[]; // One or more photo slots
  description?: string; // Optional frame description for UI
  isDefault?: boolean; // Default selection flag
}

/**
 * Frame configurations
 * NOTE: Photo slot coordinates are estimated and need verification
 * TODO: Measure exact coordinates using image editor or measurement tool
 */
export const FRAME_CONFIGS: Record<string, FrameConfig> = {
  ifta: {
    id: 'ifta',
    name: 'My New Frame',
    path: '/assets/ifta.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    isDefault: true,
    photoSlots: [
      { x: 105, y: 238, width: 973, height: 859 }, // Slot 1
    ],
  },
  image: {
    id: 'image',
    name: 'My New Frame',
    path: '/assets/image.png',
    width: 1181,
    height: 1772,
    orientation: 'vertical',
    photoSlots: [
      { x: 34, y: 320, width: 531, height: 435 }, // Slot 1
      { x: 583, y: 321, width: 570, height: 435 }, // Slot 2
      { x: 582, y: 997, width: 533, height: 437 }, // Slot 3
    ],
  },
};

/**
 * Get the default frame configuration
 */
export function getDefaultFrame(): FrameConfig {
  return (
    Object.values(FRAME_CONFIGS).find((f) => f.isDefault) ||
    FRAME_CONFIGS['ifta']
  );
}

/**
 * Get frame configuration by ID
 */
export function getFrameById(id: string): FrameConfig | undefined {
  return FRAME_CONFIGS[id];
}

/**
 * Get all available frames
 */
export function getAllFrames(): FrameConfig[] {
  return Object.values(FRAME_CONFIGS);
}
