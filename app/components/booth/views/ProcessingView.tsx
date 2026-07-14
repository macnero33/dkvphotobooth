interface ProcessingViewProps {
  message?: string;
}

export function ProcessingView({ message = 'Processing your photos...' }: ProcessingViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-gray-200 text-gray-800 p-8">
      <div className="text-center space-y-8">
        {/* Animated spinner */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 border-8 border-gray-300 border-opacity-30 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <h2 className="text-4xl font-bold text-gray-800">{message}</h2>
        <p className="text-xl text-gray-500">
          Creating your photo strip...
        </p>

        {/* Progress dots */}
        <div className="flex gap-3 justify-center">
          <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
