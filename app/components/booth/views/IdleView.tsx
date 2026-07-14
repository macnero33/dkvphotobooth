import { useState, useEffect, useReducer } from 'react';
import { Button } from '../../ui/button';
import { getAllFrames } from '../../../lib/frame-config';
import { cn } from '../../../lib/utils';

interface IdleViewProps {
  onStart: () => void;
  onSelectFrame: (frameId: string) => void;
  selectedFrameId: string;
  cameraDevices: MediaDeviceInfo[];
  selectedCameraId: string | null;
  onSelectCamera: (deviceId: string) => void;
  onDevicesFound: (devices: MediaDeviceInfo[]) => void;
}

type CameraStatus = 'checking' | 'granted' | 'denied' | 'error';

// Frame selector state management using useReducer
type SelectorState = {
  selectedId: string;
  hoveredId: string | null;
};

type SelectorAction =
  | { type: 'SELECT'; id: string }
  | { type: 'HOVER'; id: string | null };

function selectorReducer(
  state: SelectorState,
  action: SelectorAction,
): SelectorState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'HOVER':
      return { ...state, hoveredId: action.id };
    default:
      return state;
  }
}

export function IdleView({
  onStart,
  onSelectFrame,
  selectedFrameId,
  cameraDevices,
  selectedCameraId,
  onSelectCamera,
  onDevicesFound,
}: IdleViewProps) {
  const [cameraStatus, setCameraStatus] =
    useState<CameraStatus>('checking');

  const [selectorState, dispatch] = useReducer(selectorReducer, {
    selectedId: selectedFrameId,
    hoveredId: null,
  });

  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    dispatch({ type: 'SELECT', id: selectedFrameId });
  }, [selectedFrameId]);

  const selectedFrame = getAllFrames().find(
    (frame) => frame.id === selectorState.selectedId,
  );

  // All frames (no orientation filter)
  const frames = getAllFrames();

  const handleFrameSelect = (frameId: string) => {
    dispatch({ type: 'SELECT', id: frameId });
    onSelectFrame(frameId);
  };

  useEffect(() => {
    // Request camera permission on mount and enumerate available devices
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === 'videoinput',
        );
        onDevicesFound(videoInputs);

        // Permission granted - stop the stream immediately
        stream.getTracks().forEach((track) => track.stop());
        setCameraStatus('granted');
      } catch (error) {
        setCameraStatus('denied');

        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setErrorMessage(
              'Camera permission denied. Please allow camera access.',
            );
          } else if (error.name === 'NotFoundError') {
            setErrorMessage('No camera found on this device.');
          } else {
            setErrorMessage('Camera access error: ' + error.message);
          }
        }
      }
    };

    requestCamera();
  }, [onDevicesFound]);

  const handleRetryPermission = async () => {
    setCameraStatus('checking');
    setErrorMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus('granted');
    } catch (error) {
      setCameraStatus('denied');
      if (error instanceof Error) {
        setErrorMessage(
          'Camera permission denied. Please check browser settings.',
        );
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-gray-200 text-gray-800 p-8">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold animate-pulse text-gray-900">
          DKV Receipt
        </h1>
        <p className="text-2xl text-gray-500">
          Your instant photobooth experience
        </p>

        {/* Camera status indicator */}
        <div className="mt-8">
          {cameraStatus === 'checking' && (
            <div className="flex items-center justify-center gap-2 text-yellow-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              <span>Requesting camera access...</span>
            </div>
          )}
          {cameraStatus === 'granted' && (
            <div className="text-green-600 flex items-center justify-center gap-2">
              <span className="text-2xl">✓</span>
              <span>Camera ready</span>
            </div>
          )}
          {cameraStatus === 'denied' && (
            <div className="text-red-600 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">✗</span>
                <span>{errorMessage}</span>
              </div>
              <Button
                onClick={handleRetryPermission}
                variant="outline"
                className="border-gray-400 text-gray-700 hover:bg-gray-100"
              >
                Retry
              </Button>
            </div>
          )}
          {cameraStatus === 'granted' && cameraDevices.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose camera
              </label>
              <select
                value={selectedCameraId ?? ''}
                onChange={(event) => onSelectCamera(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800"
              >
                {cameraDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Frame Selection Section */}
        <div className="mt-8 space-y-4 max-w-5xl mx-auto">
          <h2 className="text-3xl font-semibold">
            Choose Your Frame
          </h2>

          {/* Frame Grid */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {frames.map((frame) => (
              <button
                key={frame.id}
                onClick={() => handleFrameSelect(frame.id)}
                onMouseEnter={() =>
                  dispatch({ type: 'HOVER', id: frame.id })
                }
                onMouseLeave={() =>
                  dispatch({ type: 'HOVER', id: null })
                }
                className={cn(
                  'relative p-1.5 rounded-lg border-2 transition-all duration-200',
                  'hover:scale-105 hover:shadow-xl bg-white',
                  selectorState.selectedId === frame.id
                    ? 'border-yellow-400 shadow-2xl'
                    : 'border-gray-200',
                )}
              >
                {/* Frame Preview */}
                <div className="aspect-[3/4] bg-gray-100 rounded overflow-hidden">
                  <img
                    src={frame.path}
                    alt={frame.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Frame Name */}
                <p className="mt-1 text-xs font-medium text-gray-700">
                  {frame.name}
                </p>

                {/* Orientation Badge */}
                <span
                  className={cn(
                    'absolute top-2 right-2 px-1.5 py-0.5 text-[10px] rounded-full font-semibold text-white',
                    frame.orientation === 'vertical'
                      ? 'bg-blue-500'
                      : 'bg-purple-500',
                  )}
                >
                  {frame.orientation === 'vertical' ? '↕' : '↔'}
                </span>

                {/* Selected Indicator */}
                {selectorState.selectedId === frame.id && (
                  <div className="absolute top-1 left-1 text-lg bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center text-gray-800">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <Button
            onClick={onStart}
            disabled={cameraStatus !== 'granted'}
            size="lg"
            className="text-2xl px-12 py-8 bg-gray-800 text-white hover:bg-gray-700 hover:scale-105 transition-all duration-300 rounded-full shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Start Photo Session
          </Button>
        </div>

        <div className="mt-16 text-gray-500 space-y-2">
          <p className="text-lg">
            ✓ Takes {selectedFrame?.photoSlots.length ?? 3} photo{selectedFrame?.photoSlots.length === 1 ? '' : 's'} with countdown
          </p>
          <p className="text-lg">✓ Creates instant photo strip</p>
          <p className="text-lg">✓ Download via QR code</p>
        </div>
      </div>
    </div>
  );
}
