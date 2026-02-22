import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Play, Plus, List, LogOut, Download } from "lucide-react";

interface TrayDropdownProps {
  stats: {
    dueCount: number;
    streakDays: number;
  };
  onStartReview: () => void;
  onCreateCard: () => void;
  onViewDecks: () => void;
  onOpenSettings: () => void;
  onOpenExportImport: () => void;
  onQuit: () => void;
}

export function TrayDropdown({
  stats,
  onStartReview,
  onCreateCard,
  onViewDecks,
  onOpenSettings,
  onOpenExportImport,
  onQuit,
}: TrayDropdownProps) {
  return (
    <Card className="w-64 border-2 shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="p-4 pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold tracking-tight">MemCycle</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onOpenSettings}
              title="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onOpenExportImport}
              title="Export/Import"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-baseline justify-between text-xs text-muted-foreground pt-1">
          <span className="font-medium text-foreground">{stats.dueCount} cards due</span>
          <span>{stats.streakDays}-day streak</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 space-y-1">
        <Button 
          className="w-full justify-start h-8 text-sm" 
          onClick={onStartReview}
        >
          <Play className="mr-2 h-3.5 w-3.5" />
          Start Review
        </Button>
        <Button 
          variant="secondary" 
          className="w-full justify-start h-8 text-sm" 
          onClick={onCreateCard}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Create Card
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start h-8 text-sm" 
          onClick={onViewDecks}
        >
          <List className="mr-2 h-3.5 w-3.5" />
          View Decks
        </Button>
      </CardContent>

      <CardFooter className="p-2 pt-0 border-t mt-1">
        <Button 
          variant="ghost" 
          className="w-full justify-start h-8 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
          onClick={onQuit}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Quit
        </Button>
      </CardFooter>
    </Card>
  );
}
