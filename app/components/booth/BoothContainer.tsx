import { useEffect, useRef, useCallback, useState } from 'react';
import { useMachine } from '@xstate/react';
import Webcam from 'react-webcam';
import { fromPromise } from 'xstate';
import { boothMachine } from '../../machines/boothMachine';
import { stitchPhotos } from '../../lib/canvas-stitcher';
import { uploadToSupabase } from '../../lib/supabase-upload';
import { generateBeepSound, generateShutterSound } from '../../lib/audio-utils';
import type { FrameConfig } from '../../lib/frame-config';
import { IdleView } from './views/IdleView';
import { CountdownView } from './views/CountdownView';
import { CaptureView } from './views/CaptureView';
import { ProcessingView } from './views/ProcessingView';
import { SuccessView } from './views/SuccessView';
import { FailureView } from './views/FailureView';

export function BoothContainer() {
  const webcamRef = useRef<Webcam | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webcamReadyRef = useRef(false);
  const videoReadyRef = useRef(false);
  const [videoStatus, setVideoStatus] = useState<'waiting' | 'ready' | 'error'>('waiting');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const isVideoReady = useCallback(() => {
    const current = webcamRef.current;
    if (!current || !current.video) {
      return false;
    }

    const video = current.video;
    return Boolean(
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth &&
        video.videoHeight,
    );
  }, []);

  const scheduleVideoReadyCheck = useCallback(() => {
    if (videoReadyTimeoutRef.current) {
      clearTimeout(videoReadyTimeoutRef.current);
    }

    const current = webcamRef.current;
    if (!current || !current.video) {
      setVideoStatus('waiting');
      videoReadyTimeoutRef.current = setTimeout(scheduleVideoReadyCheck, 200);
      return;
    }

    if (isVideoReady()) {
      videoReadyRef.current = true;
      setVideoStatus('ready');
      return;
    }

    setVideoStatus('waiting');
    videoReadyTimeoutRef.current = setTimeout(scheduleVideoReadyCheck, 200);
  }, [isVideoReady]);

  const handleWebcamReady = useCallback(() => {
    webcamReadyRef.current = true;
    setVideoStatus('waiting');
    scheduleVideoReadyCheck();
  }, [scheduleVideoReadyCheck]);

  const handleAvailableCameras = useCallback((devices: MediaDeviceInfo[]) => {
    setCameraDevices(devices);
    setSelectedCameraId((current) => current ?? devices[0]?.deviceId ?? null);
  }, []);

  // Initialize state machine with service implementations
  const [state, send] = useMachine(
    boothMachine.provide({
      actors: {
        stitchPhotos: fromPromise(async ({ input }) => {
          const { images, frameConfig } = input as {
            images: string[];
            frameConfig: FrameConfig;
          };
          return await stitchPhotos(images, frameConfig);
        }),
        uploadToSupabase: fromPromise(async ({ input }) => {
          const { blob } = input as { blob: Blob };
          return await uploadToSupabase(blob);
        }),
      }
    })
  );

  const handleWebcamError = useCallback((error: string | DOMException) => {
    console.error('Webcam error:', error);
    webcamReadyRef.current = false;
    videoReadyRef.current = false;
    setVideoStatus('error');

    if (state.matches('capture')) {
      send({
        type: 'CAPTURE_ERROR',
        error:
          typeof error === 'string'
            ? error
            : error.message || 'Camera initialization failed.',
      });
    }
  }, [send, state]);

  // Initialize audio on mount
  useEffect(() => {
    try {
      const beepDataUrl = generateBeepSound();
      const shutterDataUrl = generateShutterSound();

      beepAudioRef.current = new Audio(beepDataUrl);
      shutterAudioRef.current = new Audio(shutterDataUrl);

      // Preload
      beepAudioRef.current.load();
      shutterAudioRef.current.load();
    } catch (error) {
      // Ignore error
    }

    return () => {
      beepAudioRef.current = null;
      shutterAudioRef.current = null;
    };
  }, []);

  // Reset webcam ready flag on state transitions
  useEffect(() => {
    // Reset webcam ready when entering countdown (new webcam instance)
    if (state.matches('countdown')) {
      webcamReadyRef.current = false;
    }
  }, [state.value]);

  // Handle countdown ticks and audio
  useEffect(() => {
    if (state.matches('countdown')) {
      // Play beep sound
      beepAudioRef.current?.play().catch(() => {});

      // Start countdown tick interval
      let tickCount = 0;
      countdownIntervalRef.current = setInterval(() => {
        tickCount++;
        if (tickCount < 3) {
          send({ type: 'COUNTDOWN_TICK' });
          beepAudioRef.current?.play().catch(() => {});
        }
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [state.value, send]);

  // Handle capture with retry logic
  useEffect(() => {
    if (!state.matches('capture')) {
      return;
    }

    // Play shutter sound when capture begins
    shutterAudioRef.current?.play().catch(() => {});

    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(() => {
      attempts++;

      const screenshot = webcamRef.current?.getScreenshot();
      if (screenshot) {
        send({ type: 'CAPTURE_DONE', image: screenshot });
        clearInterval(interval);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        send({
          type: 'CAPTURE_ERROR',
          error: 'Failed to capture photo. Please try again.',
        });
      }
    }, 200);

    return () => clearInterval(interval);
  }, [state.value, send]);

  return (
    <div className="w-full h-full relative">
      {state.matches('idle') ? (
        <IdleView
          onStart={() => send({ type: 'START' })}
          onSelectFrame={(frameId) => send({ type: 'SELECT_FRAME', frameId })}
          selectedFrameId={state.context.selectedFrameId}
          cameraDevices={cameraDevices}
          selectedCameraId={selectedCameraId}
          onSelectCamera={setSelectedCameraId}
          onDevicesFound={handleAvailableCameras}
        />
      ) : state.matches('countdown') ? (
        <CountdownView
          countdown={state.context.countdown}
          webcamRef={webcamRef}
          currentPhotoNumber={state.context.currentImageIndex + 1}
          selectedCameraId={selectedCameraId}
          onWebcamReady={handleWebcamReady}
          onWebcamError={handleWebcamError}
        />
      ) : state.matches('capture') ? (
        <CaptureView
          webcamRef={webcamRef}
          selectedCameraId={selectedCameraId}
          onWebcamReady={handleWebcamReady}
          onWebcamError={handleWebcamError}
        />
      ) : state.matches('checkProgress') ? (
        <ProcessingView message="Processing..." />
      ) : state.matches('stitching') ? (
        <ProcessingView message="Creating your photo strip..." />
      ) : state.matches('uploading') ? (
        <ProcessingView message="Uploading your photos..." />
      ) : state.matches('success') ? (
        <SuccessView
          uploadUrl={state.context.uploadUrl!}
          publicId={state.context.publicId!}
          images={state.context.images}
          onReset={() => send({ type: 'RESET' })}
        />
      ) : state.matches('failure') ? (
        <FailureView
          error={state.context.error || 'An unknown error occurred'}
          onRetry={() => send({ type: 'RETRY' })}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
