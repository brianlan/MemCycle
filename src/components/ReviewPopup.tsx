import { useState, useEffect, useCallback, useRef } from 'react';
import { Card as CardType, Rating } from '../lib/types';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RatingButtons } from './RatingButtons';
import { useKeyboardShortcuts, reviewPopupShortcuts } from '../lib/hooks/useKeyboardShortcuts';
import { AUTO_DISMISS_SECONDS } from '../lib/constants';

interface ReviewPopupProps {
  cards: CardType[];
  onReview: (cardId: string, rating: Rating) => void;
  onDismiss: () => void;
  className?: string;
}

export function ReviewPopup({ cards, onReview, onDismiss, className }: ReviewPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissedRef = useRef(false);

  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length && cards.length > 0;
  const isEmpty = cards.length === 0;

  useEffect(() => {
    setIsRevealed(false);
    setCountdown(AUTO_DISMISS_SECONDS);
    dismissedRef.current = false;
  }, [currentIndex, cards]);

  useEffect(() => {
    if (isEmpty || isFinished || isRevealed) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Call onDismiss only once when countdown reaches 0
           if (!dismissedRef.current) {
             dismissedRef.current = true;
             if (typeof queueMicrotask === 'function') {
               queueMicrotask(onDismiss);
             } else {
               Promise.resolve().then(onDismiss);
             }
           }
           return 0;
         }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isEmpty, isFinished, isRevealed, onDismiss]);

  const handleReveal = useCallback(() => {
    if (!isRevealed) setIsRevealed(true);
  }, [isRevealed]);

  const handleRate = useCallback((rating: Rating) => {
    if (!currentCard) return;
    
    onReview(currentCard.id, rating);
    
    if (currentIndex < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentCard, currentIndex, cards.length, onReview]);

  useKeyboardShortcuts({
    shortcuts: reviewPopupShortcuts(
      isRevealed,
      handleReveal,
      handleRate as (rating: 1 | 2 | 3 | 4) => void,
      onDismiss
    ),
    enabled: !isEmpty && !isFinished,
  });

  if (isEmpty || isFinished) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className || ''}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">No cards due!</h2>
          <p className="text-muted-foreground mb-6">You're all caught up for now.</p>
          <Button onClick={onDismiss}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-2xl mx-auto flex flex-col min-h-[400px] ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="text-sm font-medium text-muted-foreground">
          Card {currentIndex + 1} of {cards.length}
        </div>
        <div className={`text-sm font-mono ${countdown < 10 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
          {countdown}s
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Front</h3>
            <MarkdownRenderer content={currentCard.front} />
          </div>

          {isRevealed && (
            <div className="pt-6 border-t animate-in fade-in duration-300 slide-in-from-bottom-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Back</h3>
              <MarkdownRenderer content={currentCard.back} />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-6 border-t bg-muted/20">
        {!isRevealed ? (
          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleReveal}
          >
            Show Answer <span className="ml-2 text-xs opacity-70 font-normal">(Space)</span>
          </Button>
        ) : (
          <div className="w-full">
            <RatingButtons onRate={handleRate} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
