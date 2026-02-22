import { useCallback, useEffect, useRef, useState } from "react";
import { DeckList } from "@/components/DeckList";
import { ReviewPopup } from "@/components/ReviewPopup";
import { CardForm } from "@/components/CardForm";
import { CollinsDictionary } from "@/components/CollinsDictionary";
import { SettingsPanel } from "@/components/SettingsPanel";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { Card as CardType, Deck, Rating } from "@/lib/types";
import { BookOpen, Settings, Menu } from "lucide-react";
import { TrayDropdown } from "@/components/TrayDropdown";
import { getSetting } from "@/lib/services/settingsService";
import { startTimer } from "@/lib/services/timerService";
import { calculateStats, getDueCards, submitReview } from "@/lib/services/schedulingService";
import { recordNoResponse } from "@/lib/services/noResponseHandler";
import { exportToFile, importFromFile } from "@/lib/services/exportService";
import { createCard } from "@/lib/repositories/cardRepository";
import { createDeck, deleteDeck, getDecks, updateDeck } from "@/lib/repositories/deckRepository";
import { hidePopup, showPopup } from "@/lib/popup";
import { useKeyboardShortcuts, globalShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

function isTauriRuntimeAvailable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return navigator.userAgent.includes("Tauri");
}

const demoReviewCards: CardType[] = [
  {
    id: "1",
    deckId: "d1",
    front: "# Card 1 Front\nWhat is the capital of France?",
    back: "# Card 1 Back\nParis",
    source: "default",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    deckId: "d1",
    front: "# Card 2 Front\n```js\nconst x = 10;\n```\nWhat is `x`?",
    back: "It is 10.",
    source: "default",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type AppView = "decks" | "cards";

function App() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<"sm2" | "leitner">("sm2");
  const [reviewCards, setReviewCards] = useState<CardType[]>([]);
  const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
  const [trayStats, setTrayStats] = useState({ dueCount: 5, streakDays: 7 });
  const [activeView, setActiveView] = useState<AppView>("decks");
  const [windowLabel, setWindowLabel] = useState("main");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const activeReviewIndexRef = useRef(0);
  const noResponseRecordedRef = useRef(false);
  const skipDismissNoResponseRef = useRef(false);

  const isTauriRuntime = isTauriRuntimeAvailable();
  const isPopupWindow = windowLabel === "popup";

  const refreshTrayStats = useCallback(async () => {
    if (!isTauriRuntimeAvailable()) {
      return;
    }

    try {
      const stats = await calculateStats();
      setTrayStats({
        dueCount: stats.due,
        streakDays: stats.streak,
      });
    } catch (error) {
      console.warn("Unable to refresh tray stats", error);
    }
  }, []);

  const closeReviewFlow = useCallback(() => {
    setIsReviewing(false);
    setReviewCards([]);
    activeReviewIndexRef.current = 0;
    noResponseRecordedRef.current = false;
  }, []);

  const handleNoResponseClose = useCallback(
    async (reason = "timeout") => {
      if (skipDismissNoResponseRef.current && reason === "dismissed") {
        skipDismissNoResponseRef.current = false;
        closeReviewFlow();
        return;
      }

      if (!isReviewing || noResponseRecordedRef.current) {
        closeReviewFlow();
        return;
      }

      const currentCardId = reviewCards[activeReviewIndexRef.current]?.id;
      noResponseRecordedRef.current = true;

      if (currentCardId && isTauriRuntimeAvailable()) {
        try {
          await recordNoResponse(currentCardId, reason);
          toast({
            title: "Review deferred",
            description: "No response recorded for the current card.",
          });
        } catch (error) {
          console.error("Failed to record no-response", error);
          toast({
            title: "Unable to defer review",
            description: "Please try again.",
            variant: "destructive",
          });
        }
      }

      closeReviewFlow();
      if (isTauriRuntime && isPopupWindow) {
        skipDismissNoResponseRef.current = true;
        await hidePopup().catch(() => {
          skipDismissNoResponseRef.current = false;
        });
      }
      await refreshTrayStats();
    },
    [closeReviewFlow, isPopupWindow, isReviewing, isTauriRuntime, refreshTrayStats, reviewCards],
  );

  const startReviewFlow = useCallback(async () => {
    let cards: CardType[] = demoReviewCards;

    if (!isTauriRuntime) {
      activeReviewIndexRef.current = 0;
      noResponseRecordedRef.current = false;
      setReviewCards(cards);
      setIsReviewing(true);
      return;
    }

    try {
      const algorithm = await getSetting("selectedAlgorithm");
      setSelectedAlgorithm(algorithm);
      cards = await getDueCards(algorithm);
    } catch (error) {
      console.error("Failed to fetch due cards", error);
      toast({
        title: "Unable to load due cards",
        description: "Please try again.",
        variant: "destructive",
      });
    }

    activeReviewIndexRef.current = 0;
    noResponseRecordedRef.current = false;
    setReviewCards(cards);
    setIsReviewing(true);
  }, [isTauriRuntime]);

  const triggerReviewFlow = useCallback(async () => {
    if (!isTauriRuntime) {
      await startReviewFlow();
      return;
    }

    if (isPopupWindow) {
      await startReviewFlow();
      return;
    }

    try {
      await showPopup();
    } catch (error) {
      toast({
        title: "Unable to open review popup",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [isPopupWindow, isTauriRuntime, startReviewFlow]);

  const handleReviewSubmission = useCallback(
    async (cardId: string, rating: Rating) => {
      if (isTauriRuntime) {
        try {
          await submitReview(cardId, rating, selectedAlgorithm);
        } catch (error) {
          console.error("Failed to submit review", error);
          toast({
            title: "Failed to save review",
            description: "Your rating could not be saved.",
            variant: "destructive",
          });
        }
      }

      activeReviewIndexRef.current += 1;

      if (activeReviewIndexRef.current >= reviewCards.length) {
        closeReviewFlow();
        if (isTauriRuntime && isPopupWindow) {
          skipDismissNoResponseRef.current = true;
          await hidePopup().catch(() => {
            skipDismissNoResponseRef.current = false;
          });
        }
      }

      await refreshTrayStats();
    },
    [closeReviewFlow, isPopupWindow, isTauriRuntime, refreshTrayStats, reviewCards.length, selectedAlgorithm],
  );

  const handleExportImport = useCallback(async () => {
    if (!isTauriRuntime) {
      toast({
        title: "Export/Import",
        description: "Not implemented in web demo.",
      });
      return;
    }

    try {
      const shouldExport = window.confirm("Choose action: OK = Export, Cancel = Import");

      if (shouldExport) {
        const exportPath = await exportToFile(true);
        toast({
          title: exportPath ? "Export complete" : "Export cancelled",
          description: exportPath ?? "No file was selected.",
        });
        return;
      }

      const importResult = await importFromFile({ includeReviewLogs: true, replaceExistingData: false });
      toast({
        title: importResult ? "Import complete" : "Import cancelled",
        description: importResult
          ? `Imported ${importResult.cardsImported} cards across ${importResult.decksImported} decks.`
          : "No file was selected.",
      });
      await refreshTrayStats();
    } catch (error) {
      console.error("Export/Import action failed", error);
      toast({
        title: "Export/Import failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [isTauriRuntime, refreshTrayStats]);

  const openDefaultCardCreator = useCallback(() => {
    setActiveView("cards");
    setIsDictionaryOpen(false);
    setIsCreating(true);
  }, []);

  useKeyboardShortcuts({
    shortcuts: globalShortcuts(
      () => setIsSettingsOpen(true),
      openDefaultCardCreator
    ),
    enabled: !isReviewing && !isCreating,
  });

  const openDictionaryCardCreator = useCallback(() => {
    setActiveView("cards");
    setIsCreating(false);
    setIsDictionaryOpen(true);
  }, []);

  const openDecksView = useCallback(() => {
    setActiveView("decks");
    setIsCreating(false);
    setIsDictionaryOpen(false);
  }, []);

  const handleQuit = useCallback(async () => {
    if (!isTauriRuntime) {
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:process|exit", { code: 0 });
    } catch (error) {
      console.warn("Tauri process exit unavailable", error);
    }
  }, [isTauriRuntime]);

  const handleSaveDefaultCard = useCallback(
    async (payload: { front: string; back: string; deckId: string }) => {
      if (!isTauriRuntime) {
        setIsCreating(false);
        toast({
          title: "Card saved",
          description: "Your new card has been created.",
        });
        return;
      }

      try {
        await createCard(payload.deckId, payload.front, payload.back, "default");
        setIsCreating(false);
        toast({
          title: "Card saved",
          description: "Your new card has been created.",
        });
        await refreshTrayStats();
      } catch (error) {
        toast({
          title: "Unable to save card",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [isTauriRuntime, refreshTrayStats],
  );

  const handleSaveDictionaryCard = useCallback(
    async (payload: { front: string; back: string; deckId: string; source: "collinsdictionary" | "default" }) => {
      if (!isTauriRuntime) {
        setIsDictionaryOpen(false);
        toast({
          title: "Card saved",
          description: "Dictionary card added successfully.",
        });
        return;
      }

      try {
        await createCard(payload.deckId, payload.front, payload.back, payload.source);
        setIsDictionaryOpen(false);
        toast({
          title: "Card saved",
          description: "Dictionary card added successfully.",
        });
        await refreshTrayStats();
      } catch (error) {
        toast({
          title: "Unable to save card",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [isTauriRuntime, refreshTrayStats],
  );

  useEffect(() => {
    if (!isTauriRuntime) {
      return;
    }

    void (async () => {
      try {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        setWindowLabel(getCurrentWebviewWindow().label);
      } catch {
        setWindowLabel("main");
      }
    })();
  }, [isTauriRuntime]);

  useEffect(() => {
    if (!isTauriRuntime) {
      return;
    }

    void (async () => {
      try {
        setAvailableDecks(await getDecks());
      } catch (error) {
        toast({
          title: "Unable to load decks",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    })();
  }, [isTauriRuntime]);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const completed = await getSetting("onboardingCompleted");
        if (!completed) {
          setIsOnboardingOpen(true);
        }
      } catch (error) {
        console.error("Failed to check onboarding status", error);
        toast({
          title: "Unable to load onboarding",
          description: "Please open Settings and retry.",
          variant: "destructive",
        });
      }
    }
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (isPopupWindow) {
      return;
    }

    void refreshTrayStats();
  }, [isPopupWindow, refreshTrayStats]);

  useEffect(() => {
    if (!isTauriRuntime || isPopupWindow) {
      return;
    }

    void startTimer().catch((error) => {
      console.warn("Failed to start timer", error);
      toast({
        title: "Timer not started",
        description: "MemCycle could not start background review timer.",
        variant: "destructive",
      });
    });
  }, [isPopupWindow, isTauriRuntime]);

  useEffect(() => {
    if (!isTauriRuntime) {
      return;
    }

    const unlistenCallbacks: Array<() => void> = [];
    let disposed = false;

    const registerListeners = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const register = async (eventName: string, callback: () => void) => {
          const unlisten = await listen(eventName, callback);
          if (disposed) {
            unlisten();
            return;
          }
          unlistenCallbacks.push(unlisten);
        };

        if (isPopupWindow) {
          await register("popup:shown", () => {
            void startReviewFlow();
          });

          await register("popup:timeout", () => {
            void handleNoResponseClose("timeout");
          });

          await register("popup:dismissed", () => {
            void handleNoResponseClose("dismissed");
          });
          return;
        }

        await register("tray:review_now", () => {
          void triggerReviewFlow();
        });

        await register("tray:open_dashboard", () => {
          setIsTrayOpen(false);
          openDecksView();
        });

        await register("tray:settings", () => {
          setIsTrayOpen(false);
          setIsSettingsOpen(true);
        });

        await register("tray:left_click", () => {
          setIsTrayOpen((previous) => !previous);
        });
      } catch (error) {
        console.warn("Failed to register Tauri listeners", error);
      }
    };

    void registerListeners();

    return () => {
      disposed = true;
      for (const unlisten of unlistenCallbacks) {
        unlisten();
      }
    };
  }, [handleNoResponseClose, isPopupWindow, isTauriRuntime, openDecksView, startReviewFlow, triggerReviewFlow]);

  if (isTauriRuntime && isPopupWindow) {
    return (
      <main className="min-h-screen bg-background p-4">
        {isReviewing ? (
          <ReviewPopup
            cards={reviewCards}
            onReview={(id, rating) => {
              void handleReviewSubmission(id, rating);
            }}
            onDismiss={() => {
              void handleNoResponseClose("dismissed");
            }}
          />
        ) : null}
        <Toaster />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b p-4 flex items-center justify-between bg-card relative z-50">
        <h1 className="text-xl font-bold px-4">MemCycle Demo</h1>
        <div className="px-4 space-x-4 flex items-center">
          <Button variant={activeView === "decks" ? "default" : "ghost"} onClick={openDecksView}>Decks</Button>
          <Button variant={activeView === "cards" ? "default" : "ghost"} onClick={() => setActiveView("cards")}>Cards</Button>
          <Button variant="ghost" size="icon" onClick={() => setIsTrayOpen(!isTrayOpen)} aria-label="Toggle Tray">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={openDictionaryCardCreator}>
            <BookOpen className="mr-2 h-4 w-4" />
            Dictionary
          </Button>
          <Button variant="outline" onClick={openDefaultCardCreator}>Create Card</Button>
          <Button onClick={() => void triggerReviewFlow()}>Start Review</Button>
        </div>
      </header>

      <div className="py-6">
        {activeView === "decks" ? (
          <DeckList
            initialDecks={availableDecks}
            onCreateDeck={isTauriRuntime ? async (data) => {
              const deck = await createDeck(data.name, data.description);
              setAvailableDecks((prev) => [...prev, deck]);
              return deck;
            } : undefined}
            onUpdateDeck={isTauriRuntime ? async (id, data) => {
              const deck = await updateDeck(id, data);
              setAvailableDecks((prev) =>
                prev.map((d) => (d.id === deck.id ? deck : d))
              );
              return deck;
            } : undefined}
            onDeleteDeck={isTauriRuntime ? async (id) => {
              await deleteDeck(id);
              setAvailableDecks((prev) => prev.filter((d) => d.id !== id));
            } : undefined}
          />
        ) : (
          <section className="container mx-auto p-6 max-w-5xl space-y-4" data-testid="cards-view-container">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">Cards</h2>
              <p className="text-muted-foreground">Create cards manually or from CollinsDictionary.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={openDefaultCardCreator}>Create Card</Button>
              <Button variant="outline" onClick={openDictionaryCardCreator}>Open CollinsDictionary</Button>
              <Button variant="ghost" onClick={() => setIsSettingsOpen(true)}>Open Settings</Button>
            </div>
          </section>
        )}
      </div>

      {isReviewing && !isTauriRuntime && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <ReviewPopup 
            cards={reviewCards}
            onReview={(id, rating) => {
              void handleReviewSubmission(id, rating);
            }}
            onDismiss={() => {
              void handleNoResponseClose("timeout");
            }}
          />
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-auto">
            <CardForm 
              decks={availableDecks}
              onSave={(payload) => {
                void handleSaveDefaultCard(payload);
              }}
              onCancel={() => setIsCreating(false)}
            />
          </div>
        </div>
      )}

      {isDictionaryOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-auto">
            <CollinsDictionary 
              decks={availableDecks}
              onSave={(payload) => {
                void handleSaveDictionaryCard(payload);
              }}
              onCancel={() => setIsDictionaryOpen(false)}
            />
          </div>
        </div>
      )}

      <SettingsPanel open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <OnboardingWizard 
        open={isOnboardingOpen} 
        onComplete={() => setIsOnboardingOpen(false)}
        onSkip={() => setIsOnboardingOpen(false)}
      />

      {isTrayOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-end p-4 pt-16 bg-transparent"
          onClick={() => setIsTrayOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="mr-8 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <TrayDropdown 
              stats={trayStats}
              onStartReview={() => {
                setIsTrayOpen(false);
                void triggerReviewFlow();
              }}
              onCreateCard={() => {
                setIsTrayOpen(false);
                openDefaultCardCreator();
              }}
              onViewDecks={() => {
                setIsTrayOpen(false);
                openDecksView();
              }}
              onOpenSettings={() => {
                setIsTrayOpen(false);
                setIsSettingsOpen(true);
              }}
              onOpenExportImport={() => {
                setIsTrayOpen(false);
                void handleExportImport();
              }}
              onQuit={() => {
                setIsTrayOpen(false);
                void handleQuit();
              }}
            />
          </div>
        </div>
      )}

      <Toaster />
    </main>
  );
}

export default App;
