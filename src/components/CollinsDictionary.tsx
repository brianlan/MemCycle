import { useState } from "react";
import { Deck, CardSource } from "@/lib/types";
import { generateDefinition } from "@/lib/services/llmService";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollinsDictionaryProps {
  decks: Deck[];
  onSave: (payload: { front: string; back: string; deckId: string; source: CardSource }) => void;
  onCancel?: () => void;
  className?: string;
}

export function CollinsDictionary({ decks, onSave, onCancel, className }: CollinsDictionaryProps) {
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deckId, setDeckId] = useState(decks.length > 0 ? decks[0].id : "");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!word.trim()) return;
    
    setIsLoading(true);
    setDefinition("");
    
    try {
      const result = await generateDefinition(word);
      setDefinition(result);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!word.trim() || !definition.trim() || !deckId) {
      return;
    }

    onSave({
      front: `# ${word}`,
      back: definition,
      deckId,
      source: "collinsdictionary",
    });

    toast({
      title: "Card Saved",
      description: `Saved "${word}" to deck.`,
    });

    setWord("");
    setDefinition("");
  };

  return (
    <Card className={cn("w-full max-w-4xl mx-auto shadow-xl border-t-4 border-t-indigo-500", className)}>
      <CardHeader className="bg-slate-50/50">
        <CardTitle className="flex items-center gap-2 font-serif text-2xl text-slate-800">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Collins AI Dictionary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="word-input" className="text-sm font-medium text-slate-600">
              Word to Define
            </label>
            <Input
              id="word-input"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. Serendipity"
              className="text-lg font-serif"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !word.trim()}
            className="mb-[2px] bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Definition"
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="space-y-2 flex flex-col h-full">
            <label htmlFor="definition-area" className="text-sm font-medium text-slate-600">
              Edit Definition (Markdown)
            </label>
            <textarea
              id="definition-area"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Definition will appear here..."
              className="flex-1 min-h-[300px] w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-sm"
            />
          </div>

          <div className="space-y-2 flex flex-col h-full">
            <label className="text-sm font-medium text-slate-600">
              Preview Card
            </label>
            <div className="flex-1 min-h-[300px] rounded-md border border-slate-200 bg-slate-50/50 p-6 overflow-y-auto shadow-inner">
              {definition ? (
                <div className="markdown-content prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-slate-800">
                  <MarkdownRenderer content={definition} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                  <span>Enter a word and click generate</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-4 pt-4 border-t border-slate-100 mt-6">
          <div className="space-y-2 flex-1 max-w-xs">
            <label htmlFor="deck-select" className="text-sm font-medium text-slate-600">
              Save to Deck
            </label>
            <div className="relative">
              <select
                id="deck-select"
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              >
                <option value="" disabled>Select a deck</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 ml-auto">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="text-slate-500 hover:text-slate-700">
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={!word.trim() || !definition.trim() || !deckId}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              <Save className="mr-2 h-4 w-4" />
              Save to Deck
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
