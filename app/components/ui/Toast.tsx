import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  useEffect(() => {
    // nothing here, visual only
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 text-black px-4 py-2 rounded-lg shadow-lg">
        {message}
      </div>
    </div>
  );
}
