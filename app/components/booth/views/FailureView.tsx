import { Button } from '../../ui/button';

interface FailureViewProps {
  error: string;
  onRetry: () => void;
}

export function FailureView({ error, onRetry }: FailureViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-gray-200 text-gray-800 p-4 sm:p-6 md:p-8">
      <div className="text-center space-y-6 sm:space-y-8 max-w-lg sm:max-w-xl md:max-w-2xl">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-5xl sm:text-6xl md:text-8xl">⚠️</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800">
            Oops!
          </h2>
          <p className="text-xl sm:text-2xl text-gray-500">
            Something went wrong
          </p>
        </div>

        {/* Error message */}
        <div className="bg-red-50 border border-red-200 p-4 sm:p-6 rounded-xl">
          <p className="text-base sm:text-lg font-mono text-red-700 break-words">
            {error}
          </p>
        </div>

        {/* Suggestions */}
        <div className="space-y-1 sm:space-y-2 text-base sm:text-lg text-gray-500">
          <p>• Check your internet connection</p>
          <p>• Make sure camera is allowed</p>
          <p>• Try again in a moment</p>
        </div>

        {/* Retry button */}
        <div className="pt-6 sm:pt-8">
          <Button
            onClick={onRetry}
            size="lg"
            className="text-xl sm:text-2xl px-8 sm:px-10 md:px-12 py-6 sm:py-7 md:py-8 bg-red-500 text-white hover:bg-red-600 hover:scale-105 transition-all duration-300 rounded-full shadow-2xl"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}