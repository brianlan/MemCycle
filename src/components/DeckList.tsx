import { useEffect, useState } from "react";
import { Deck } from "@/lib/types";
import { DeckCard } from "./DeckCard";
import { DeckForm } from "./DeckForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DeckListProps {
  initialDecks?: Deck[];
  onCreateDeck?: (data: { name: string; description: string }) => Promise<Deck>;
  onUpdateDeck?: (id: string, data: { name: string; description: string }) => Promise<Deck>;
  onDeleteDeck?: (id: string) => Promise<void>;
}

export function DeckList({ 
  initialDecks = [],
  onCreateDeck,
  onUpdateDeck,
  onDeleteDeck,
}: DeckListProps) {
  const [decks, setDecks] = useState<Deck[]>(initialDecks);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);

  useEffect(() => {
    setDecks(initialDecks);
  }, [initialDecks]);

  const handleCreate = async (data: { name: string; description: string }) => {
    if (onCreateDeck) {
      const newDeck = await onCreateDeck(data);
      setDecks((prev) => [...prev, newDeck]);
    } else {
      const newDeck: Deck = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: data.name,
        description: data.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDecks((prev) => [...prev, newDeck]);
    }
    setIsCreateOpen(false);
  };

  const handleEdit = async (data: { name: string; description: string }) => {
    if (!editingDeck) return;
    
    if (onUpdateDeck) {
      const updatedDeck = await onUpdateDeck(editingDeck.id, data);
      setDecks((prev) =>
        prev.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
      );
    } else {
      setDecks((prev) =>
        prev.map((d) =>
          d.id === editingDeck.id
            ? {
                ...d,
                name: data.name,
                description: data.description,
                updatedAt: new Date().toISOString(),
              }
            : d
        )
      );
    }
    setEditingDeck(null);
  };

  const handleDelete = async () => {
    if (!deletingDeck) return;
    
    if (onDeleteDeck) {
      await onDeleteDeck(deletingDeck.id);
    }
    
    setDecks((prev) => prev.filter((d) => d.id !== deletingDeck.id));
    if (selectedDeckId === deletingDeck.id) {
      setSelectedDeckId(null);
    }
    setDeletingDeck(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8" data-testid="deck-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decks</h1>
          <p className="text-muted-foreground mt-1">Manage your flashcard collections.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="create-deck-button">
          <Plus className="mr-2 h-4 w-4" /> New Deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <div 
          className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center animate-in fade-in-50"
          data-testid="empty-state"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
            <Plus className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No decks yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first deck!
          </p>
          <Button onClick={() => setIsCreateOpen(true)} data-testid="create-deck-button-empty">Create Deck</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {decks.map((deck) => (
            <div key={deck.id} data-testid={`deck-card-${deck.id}`}>
              <DeckCard
                deck={deck}
                isSelected={selectedDeckId === deck.id}
                onSelect={(d) => setSelectedDeckId(d.id)}
                onEdit={(d) => setEditingDeck(d)}
                onDelete={(d) => setDeletingDeck(d)}
              />
            </div>
          ))}
        </div>
      )}

      <DeckForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        onSubmit={handleCreate}
      />

      <DeckForm
        open={!!editingDeck}
        onOpenChange={(open) => !open && setEditingDeck(null)}
        mode="edit"
        initialData={editingDeck || undefined}
        onSubmit={handleEdit}
      />

      <Dialog open={!!deletingDeck} onOpenChange={(open) => !open && setDeletingDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDeck?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingDeck(null)}
              data-testid="cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              data-testid="confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
