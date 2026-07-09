import { Button } from '../../ui/button';

interface ReviewViewProps {
  image: string;
  onAccept: () => void;
  onRetake: () => void;
}

export function ReviewView({ image, onAccept, onRetake }: ReviewViewProps) {
  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white/5 rounded-lg overflow-hidden shadow-2xl">
        <img src={image} alt="Captured" className="w-full h-auto object-contain" />
      </div>

      <div className="mt-6 flex gap-4">
        <Button onClick={onRetake} variant="outline" className="px-8 py-4">
          Retake
        </Button>
        <Button onClick={onAccept} className="px-8 py-4 bg-white text-purple-700">
          Keep Photo
        </Button>
      </div>
    </div>
  );
}
