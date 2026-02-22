import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { setSetting } from "@/lib/services/settingsService";
import { ArrowRight, Check, Sparkles, Clock, Layers, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 6;

export function OnboardingWizard({ open, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [deckName, setDeckName] = useState("My First Deck");
  const [cardFront, setCardFront] = useState("What is the capital of France?");
  const [cardBack, setCardBack] = useState("Paris");
  const [interval, setInterval] = useState(25);
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await setSetting("popupIntervalMinutes", interval);
      if (llmApiKey && llmEndpoint) {
        await setSetting("llmApiKey", llmApiKey);
        await setSetting("llmEndpoint", llmEndpoint);
      }
      
      await setSetting("onboardingCompleted", true);
      onComplete();
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      await setSetting("onboardingCompleted", true);
      onSkip();
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center space-x-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full transition-all duration-300",
            step === i + 1 ? "bg-primary w-6" : "bg-muted"
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className="p-6 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
            aria-label="Skip Onboarding"
          >
            <X className="h-4 w-4" />
          </Button>

          {renderStepIndicator()}

          <div className="min-h-[300px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 key={step}">
            
            {step === 1 && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-8 w-8" />
                </div>
                <DialogTitle className="text-3xl font-bold tracking-tight">Welcome to MemCycle</DialogTitle>
                <DialogDescription className="text-lg text-muted-foreground">
                  Master any subject with spaced repetition. Let's set up your learning environment in less than a minute.
                </DialogDescription>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Create your first Deck</DialogTitle>
                    <DialogDescription>Decks organize your flashcards by topic.</DialogDescription>
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <label className="text-sm font-medium">Deck Name</label>
                  <Input 
                    value={deckName} 
                    onChange={(e) => setDeckName(e.target.value)} 
                    placeholder="e.g., French Vocabulary"
                    className="text-lg py-6"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                 <div className="flex items-center space-x-4 mb-2">
                  <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Add your first Card</DialogTitle>
                    <DialogDescription>What do you want to remember?</DialogDescription>
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Front (Question)</label>
                    <Input 
                      value={cardFront} 
                      onChange={(e) => setCardFront(e.target.value)}
                      placeholder="Question or term"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Back (Answer)</label>
                    <Input 
                      value={cardBack} 
                      onChange={(e) => setCardBack(e.target.value)}
                      placeholder="Answer or definition"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Set your Rhythm</DialogTitle>
                    <DialogDescription>How often should review popups appear?</DialogDescription>
                  </div>
                </div>
                <div className="py-8 px-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-4xl font-bold text-primary">{interval}</span>
                    <span className="text-muted-foreground">minutes</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    We recommend 25 minutes for optimal focus cycles.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">AI Assistant (Optional)</DialogTitle>
                    <DialogDescription>Connect an LLM to auto-generate cards.</DialogDescription>
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Endpoint</label>
                    <Input 
                      value={llmEndpoint} 
                      onChange={(e) => setLlmEndpoint(e.target.value)}
                      placeholder="https://api.openai.com/v1/chat/completions"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <Input 
                      type="password"
                      value={llmApiKey} 
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your key is stored locally and encrypted. You can skip this step and configure it later.
                  </p>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center space-y-6 py-4">
                <div className="h-20 w-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                  <Check className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-3xl font-bold">You're all set!</DialogTitle>
                  <DialogDescription className="text-lg">
                    MemCycle will run quietly in the background and nudge you when it's time to learn.
                  </DialogDescription>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/50 flex items-center justify-between sm:justify-between w-full">
           <Button variant="ghost" onClick={handleBack} disabled={step === 1} className={step === 1 ? "invisible" : ""}>
            Back
          </Button>
          <div className="flex gap-2">
            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} className="w-32 group">
                {step === 5 ? "Skip & Next" : "Next"} 
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={isSubmitting} className="w-32 bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting ? "Saving..." : "Get Started"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
