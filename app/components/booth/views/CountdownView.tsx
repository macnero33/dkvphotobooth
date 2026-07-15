import Webcam from 'react-webcam';
import type { RefObject } from 'react';

interface CountdownViewProps {
  countdown: number;
  webcamRef: RefObject<Webcam | null>;
  currentPhotoNumber: number;
  photoCount: number;
  selectedCameraId?: string | null;
  onWebcamReady?: () => void;
  onWebcamError?: (error: string | DOMException) => void;
}

const defaultVideoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

export function CountdownView({
  countdown,
  webcamRef,
  currentPhotoNumber,
  photoCount,
  selectedCameraId,
  onWebcamReady,
  onWebcamError,
}: CountdownViewProps) {
  const videoConstraints = selectedCameraId
    ? { deviceId: { exact: selectedCameraId } }
    : defaultVideoConstraints;

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Webcam preview (mirrored) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          videoConstraints={videoConstraints}
          mirrored={true}
          onUserMedia={onWebcamReady}
          onUserMediaError={onWebcamError}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Photo number indicator */}
      <div className="absolute top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-white bg-opacity-90 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full">
          <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
            Photo {currentPhotoNumber} of {photoCount}
          </p>
        </div>
      </div>

      {/* Countdown number */}
      <div className="relative z-10 text-center">
        <div
          className="text-white font-bold animate-pulse"
          style={{
            fontSize: 'clamp(6rem, 30vw, 20rem)',
            lineHeight: '1',
            textShadow: '0 0 40px rgba(0,0,0,0.5)',
          }}
        >
          {countdown}
        </div>
        <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white mt-4 sm:mt-6 md:mt-8 animate-bounce">
          Get ready!
        </p>
      </div>
    </div>
  );
}