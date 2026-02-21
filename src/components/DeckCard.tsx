import { Deck } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Calendar } from "lucide-react";

interface DeckCardProps {
  deck: Deck;
  onSelect: (deck: Deck) => void;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
  isSelected?: boolean;
}

export function DeckCard({ deck, onSelect, onEdit, onDelete, isSelected }: DeckCardProps) {
  return (
    <Card 
      className={`
        relative group transition-all duration-200 hover:shadow-md cursor-pointer
        ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}
      `}
      onClick={() => onSelect(deck)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-bold leading-tight truncate" title={deck.name}>
            {deck.name}
          </CardTitle>
        </div>
        <CardDescription className="line-clamp-2 h-10 text-sm">
          {deck.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Calendar className="w-3 h-3" />
          <span>Created {new Date(deck.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="flex gap-4 mt-3 text-sm font-medium">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Cards</span>
            <span>0</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Due</span>
            <span className="text-primary">0</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(deck);
          }}
          aria-label={`Edit ${deck.name}`}
          data-testid="edit-deck-button"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deck);
          }}
          aria-label={`Delete ${deck.name}`}
          data-testid="delete-deck-button"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
