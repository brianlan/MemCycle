import { Button } from './ui/button';
import { Rating } from '../lib/types';

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      <Button
        variant="destructive"
        onClick={() => onRate(1)}
        disabled={disabled}
        className="w-full flex flex-col h-auto py-2"
      >
        <span className="font-bold">Again</span>
        <span className="text-xs opacity-70">(1)</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => onRate(2)}
        disabled={disabled}
        className="w-full flex flex-col h-auto py-2 bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-200"
      >
        <span className="font-bold">Hard</span>
        <span className="text-xs opacity-70">(2)</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => onRate(3)}
        disabled={disabled}
        className="w-full flex flex-col h-auto py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-200"
      >
        <span className="font-bold">Good</span>
        <span className="text-xs opacity-70">(3)</span>
      </Button>
      <Button
        variant="default"
        onClick={() => onRate(4)}
        disabled={disabled}
        className="w-full flex flex-col h-auto py-2 bg-green-600 hover:bg-green-700"
      >
        <span className="font-bold">Easy</span>
        <span className="text-xs opacity-70">(4)</span>
      </Button>
    </div>
  );
}
