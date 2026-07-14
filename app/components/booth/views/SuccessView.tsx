import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';

interface SuccessViewProps {
  uploadUrl: string;
  publicId: string;
  images: string[]; // Array of 3 captured photos (base64)
  onReset: () => void;
}

export function SuccessView({
  uploadUrl,
  publicId,
  images,
  onReset,
}: SuccessViewProps) {
  // Detect image orientation
  const [imageOrientation, setImageOrientation] = useState<
    'vertical' | 'horizontal'
  >('vertical');
  const [copyStatus, setCopyStatus] = useState('Copy link');

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageOrientation(
        img.width > img.height ? 'horizontal' : 'vertical',
      );
    };
    img.src = uploadUrl;
  }, [uploadUrl]);

  const retrievalUrl = uploadUrl;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = uploadUrl;
    a.download = publicId;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isInternalPhotoRoute = retrievalUrl.includes('/photo/');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(retrievalUrl);
      setCopyStatus('Link copied!');
      window.setTimeout(() => setCopyStatus('Copy link'), 2000);
    } catch (error) {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus('Copy link'), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-gray-200 text-gray-800 p-8">
      <div className="text-center space-y-8 max-w-4xl">
        <div className="space-y-4">
          <div className="text-6xl text-green-500">✓</div>
          <h2 className="text-5xl font-bold text-gray-800">All Done!</h2>
          <p className="text-2xl text-gray-500">
            Your photo strip is ready
          </p>
        </div>

        {/* Display all 3 captured photos */}
        <div className="flex justify-center gap-4 flex-wrap">
          {images.map((image, index) => (
            <div
              key={index}
              className="bg-white p-3 rounded-lg shadow-2xl"
            >
              <img
                src={image}
                alt={`Photo ${index + 1}`}
                className="w-48 h-auto rounded shadow-lg"
              />
              <p className="text-gray-700 text-sm mt-2 font-semibold">
                Photo {index + 1}
              </p>
            </div>
          ))}
        </div>

        {/* Photo Strip and QR Code - responsive layout based on orientation */}
        <div
          className={cn(
            'flex justify-center items-start gap-8 flex-wrap',
            imageOrientation === 'horizontal'
              ? 'flex-col items-center'
              : '',
          )}
        >
          {/* Final stitched photo strip */}
          <div className="flex flex-col items-center">
            <h3 className="text-2xl font-semibold mb-4">
              Final Photo Strip
            </h3>
            <div className="bg-white p-4 rounded-lg shadow-2xl">
              <img
                src={uploadUrl}
                alt="Your photo strip"
                className={cn(
                  'rounded shadow-lg',
                  imageOrientation === 'vertical'
                    ? 'w-64 h-auto'
                    : 'h-64 w-auto',
                )}
              />
            </div>
            <div className="mt-4 flex gap-3 flex-wrap justify-center">
              <Button
                onClick={handleDownload}
                size="lg"
                className="text-lg px-6 py-4 bg-gray-800 text-white hover:bg-gray-700 rounded-full"
              >
                Download Strip
              </Button>
              <Button
                onClick={handleCopyLink}
                size="lg"
                variant="outline"
                className="text-lg px-6 py-4 border-gray-400 text-gray-700 hover:bg-gray-100 rounded-full"
              >
                {copyStatus}
              </Button>
            </div>
          </div>

          {/* QR Code with Instructions and Button */}
          <div className="flex flex-col items-center">
            <h3 className="text-2xl font-semibold mb-4">
              Scan to Download
            </h3>
            <div className="bg-white p-8 rounded-2xl shadow-2xl">
              <div className="mb-4">
                <p className="text-gray-600 text-center">
                  Use your phone camera
                </p>
              </div>
              <QRCodeSVG
                value={retrievalUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="mt-4 text-sm text-gray-500 break-all text-center max-w-xs">
              {retrievalUrl}
            </div>
            {isInternalPhotoRoute ? (
              <div className="mt-4 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-300">
                Warning: this link looks like an internal app route. It should be a
                direct Supabase URL for reliable download.
              </div>
            ) : (
              <div className="mt-4 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-300">
                Good: this is a direct download URL from Supabase.
              </div>
            )}

            {/* Instructions below QR code */}
            <div className="mt-6 space-y-2 text-lg text-gray-600">
              <p>📱 Open your phone camera</p>
              <p>📸 Point at the QR code</p>
              <p>💾 Download your photo strip</p>
            </div>

            {/* Start New Session button */}
            <div className="mt-6">
              <Button
                onClick={onReset}
                size="lg"
                variant="outline"
                className="text-xl px-8 py-6 border-gray-400 text-gray-700 hover:bg-gray-100 rounded-full"
              >
                Start New Session
              </Button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          This session will auto-reset in 60 seconds
        </p>
      </div>
    </div>
  );
}
