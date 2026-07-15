import Webcam from 'react-webcam';
import type { RefObject } from 'react';

interface CaptureViewProps {
  webcamRef: RefObject<Webcam | null>;
  selectedCameraId?: string | null;
  onWebcamReady?: () => void;
  onWebcamError?: (error: string | DOMException) => void;
}

const defaultVideoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

export function CaptureView({
  webcamRef,
  selectedCameraId,
  onWebcamReady,
  onWebcamError,
}: CaptureViewProps) {
  const videoConstraints = selectedCameraId
    ? { deviceId: { exact: selectedCameraId } }
    : defaultVideoConstraints;

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Webcam preview (mirrored) */}
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.92}
        videoConstraints={videoConstraints}
        mirrored={true}
        onUserMedia={onWebcamReady}
        onUserMediaError={onWebcamError}
        className="w-full h-full object-cover"
      />

      {/* Flash animation overlay */}
      <div className="absolute inset-0 bg-white animate-flash pointer-events-none" />

      <style>{`
        @keyframes flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .animate-flash {
          animation: flash 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}