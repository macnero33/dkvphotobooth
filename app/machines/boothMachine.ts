import { assign, createMachine, fromPromise } from 'xstate';
import { getDefaultFrame, getFrameById, type FrameConfig } from '../lib/frame-config';

export interface BoothContext {
  images: string[]; // base64 data URLs
  currentImageIndex: number; // 0-2 for progress tracking
  finalStripBlob: Blob | null; // local stitched image
  uploadUrl: string | null; // Supabase public URL
  publicId: string | null; // Storage filename / QR identifier
  error: string | null;
  countdown: number; // 3, 2, 1 for UI display
  uploadRetries: number; // Track retry attempts
  selectedFrameId: string; // Selected frame config ID
}

export type BoothEvent =
  | { type: 'START' }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'CAPTURE_DONE'; image: string }
  | { type: 'CAPTURE_ERROR'; error: string }
  | { type: 'STITCH_DONE'; blob: Blob }
  | { type: 'STITCH_ERROR'; error: string }
  | { type: 'UPLOAD_DONE'; url: string; publicId: string }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'SELECT_FRAME'; frameId: string };

// Service types for invoked actors
export interface CountdownInput {
  duration: number;
}

export interface StitchInput {
  images: string[];
  frameConfig: FrameConfig; // Changed from frameUrl
}

export interface UploadInput {
  blob: Blob;
}

export const boothMachine = createMachine(
  {
    id: 'booth',
    initial: 'idle',
    types: {} as {
      context: BoothContext;
      events: BoothEvent;
    },
    context: {
      images: [],
      currentImageIndex: 0,
      finalStripBlob: null,
      uploadUrl: null,
      publicId: null,
      error: null,
      countdown: 3,
      uploadRetries: 0,
      selectedFrameId: getDefaultFrame().id,
    },
    states: {
      idle: {
        entry: assign({
          images: [],
          currentImageIndex: 0,
          finalStripBlob: null,
          uploadUrl: null,
          publicId: null,
          error: null,
          countdown: 3,
          uploadRetries: 0,
          selectedFrameId: getDefaultFrame().id,
        }),
        on: {
          START: 'countdown',
          SELECT_FRAME: {
            actions: assign({
              selectedFrameId: ({ event }) => event.frameId,
            }),
          },
        },
      },

      countdown: {
        entry: assign({ countdown: 3 }),
        invoke: {
          id: 'countdownTimer',
          src: fromPromise(async () => {
            return new Promise<void>((resolve) => {
              setTimeout(resolve, 3000);
            });
          }),
          onDone: {
            target: 'capture',
          },
        },
        on: {
          COUNTDOWN_TICK: {
            actions: assign({
              countdown: ({ context }) => Math.max(0, context.countdown - 1),
            }),
          },
        },
      },

      capture: {
        // The actual capture logic is handled externally via service override
        // Machine just waits for CAPTURE_DONE or CAPTURE_ERROR events
        on: {
          CAPTURE_DONE: {
            actions: assign({
              images: ({ context, event }) => [...context.images, event.image],
              currentImageIndex: ({ context }) => context.currentImageIndex + 1,
            }),
            target: 'checkProgress',
          },
          CAPTURE_ERROR: {
            actions: assign({
              error: ({ event }) => event.error,
            }),
            target: 'failure',
          },
        },
      },

      checkProgress: {
        always: [
          {
            guard: ({ context }) => context.images.length < 3,
            target: 'countdown',
          },
          {
            guard: ({ context }) => context.images.length === 3,
            target: 'stitching',
          },
        ],
      },

      stitching: {
        invoke: {
          id: 'stitchService',
          src: 'stitchPhotos', // Will be provided at runtime
          input: ({ context }) => {
            const frameConfig = getFrameById(context.selectedFrameId);
            if (!frameConfig) {
              throw new Error(`Frame not found: ${context.selectedFrameId}`);
            }
            return {
              images: context.images,
              frameConfig,
            };
          },
          onDone: {
            target: 'uploading',
            actions: assign({
              finalStripBlob: ({ event }) => event.output as Blob,
            }),
          },
          onError: {
            target: 'failure',
            actions: assign({
              error: ({ event }) =>
                event.error instanceof Error
                  ? event.error.message
                  : 'Image processing failed',
            }),
          },
        },
      },

      uploading: {
        invoke: {
          id: 'uploadService',
          src: 'uploadToSupabase', // Will be provided at runtime
          input: ({ context }) => ({
            blob: context.finalStripBlob!,
          }),
          onDone: {
            target: 'success',
            actions: assign({
              uploadUrl: ({ event }) => (event.output as { url: string; publicId: string }).url,
              publicId: ({ event }) => (event.output as { url: string; publicId: string }).publicId,
              uploadRetries: 0,
            }),
          },
          onError: [
            {
              guard: ({ context }) => context.uploadRetries < 3,
              target: 'uploading',
              actions: assign({
                uploadRetries: ({ context }) => context.uploadRetries + 1,
              }),
            },
            {
              target: 'failure',
              actions: assign({
                error: ({ event }) =>
                  event.error instanceof Error
                    ? event.error.message
                    : 'Upload failed after multiple retries',
              }),
            },
          ],
        },
      },

      success: {
        on: {
          RESET: 'idle',
        },
      },

      failure: {
        on: {
          RETRY: 'uploading', // Simplified retry, directly attempts upload again
        },
      },
    },
  },
  {
    actions: {},
    actors: {},
    guards: {},
    delays: {},
  }
);
