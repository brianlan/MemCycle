import { useState, useEffect, useRef } from "react";
import { Deck, Card } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Button } from "./ui/button";
import { Card as UICard, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { cn } from "@/lib/utils";

interface CardFormProps {
  decks: Deck[];
  initialCard?: Partial<Card> & { deckId?: string };
  onSave: (payload: { front: string; back: string; deckId: string }) => void;
  onCancel?: () => void;
  className?: string;
}

export function CardForm({ decks, initialCard, onSave, onCancel, className }: CardFormProps) {
  const [front, setFront] = useState(initialCard?.front || "");
  const [back, setBack] = useState(initialCard?.back || "");
  const [deckId, setDeckId] = useState(initialCard?.deckId || (decks.length > 0 ? decks[0].id : ""));

  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };

    const frontEl = frontRef.current;
    const backEl = backRef.current;

    frontEl?.addEventListener("keydown", handleKeyDown);
    backEl?.addEventListener("keydown", handleKeyDown);

    return () => {
      frontEl?.removeEventListener("keydown", handleKeyDown);
      backEl?.removeEventListener("keydown", handleKeyDown);
    };
  }, [front, back, deckId]);

  const handleSave = () => {
    if (!front.trim() || !back.trim() || !deckId) {
      return;
    }
    onSave({ front, back, deckId });
    
    if (!initialCard) {
      setFront("");
      setBack("");
      frontRef.current?.focus();
    }
  };

  return (
    <UICard className={cn("w-full max-w-4xl mx-auto shadow-lg", className)}>
      <CardHeader>
        <CardTitle>{initialCard ? "Edit Card" : "Create New Card"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="deck-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Deck
          </label>
          <select
            id="deck-select"
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>Select a deck</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label htmlFor="front-input" className="text-sm font-medium">Front (Markdown)</label>
              <span className="text-xs text-muted-foreground">{front.length} chars</span>
            </div>
            <textarea
              id="front-input"
              ref={frontRef}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question or prompt..."
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Preview</label>
            <div className="min-h-[150px] rounded-md border bg-muted/50 p-4 overflow-y-auto max-h-[300px]">
              {front ? (
                <MarkdownRenderer content={front} />
              ) : (
                <span className="text-sm text-muted-foreground italic">Preview will appear here...</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label htmlFor="back-input" className="text-sm font-medium">Back (Markdown)</label>
              <span className="text-xs text-muted-foreground">{back.length} chars</span>
            </div>
            <textarea
              id="back-input"
              ref={backRef}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Answer or solution..."
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Preview</label>
            <div className="min-h-[150px] rounded-md border bg-muted/50 p-4 overflow-y-auto max-h-[300px]">
              {back ? (
                <MarkdownRenderer content={back} />
              ) : (
                <span className="text-sm text-muted-foreground italic">Preview will appear here...</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">Cmd+Enter</span> to save
        </div>
        <div className="space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={!front.trim() || !back.trim() || !deckId}>
            Save Card
          </Button>
        </div>
      </CardFooter>
    </UICard>
  );
}
