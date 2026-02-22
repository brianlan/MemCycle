import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  getAllSettings,
  setSetting,
  resetToDefaults,
  type AppSettings
} from "@/lib/services/settingsService";
import { enableAutostart, disableAutostart, isAutostartEnabled } from "@/lib/services/autostartService";
import { generateDefinition } from "@/lib/services/llmService";
import { Loader2, Save, RotateCcw, Settings } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "general" | "timing" | "algorithm" | "database" | "llm";

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(false);
  const [testingLLM, setTestingLLM] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getAllSettings();
      
      // Reconcile with actual autostart status on macOS (Tauri only)
      try {
        const autostartStatus = await isAutostartEnabled();
        if (autostartStatus !== undefined) {
          data.launchAtLogin = autostartStatus;
        }
      } catch (e) {
        // Ignore errors - use stored value if can't query
        console.warn("Could not query autostart status:", e);
      }
      
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      await Promise.all([
        setSetting("popupIntervalMinutes", settings.popupIntervalMinutes),
        setSetting("autoDismissSeconds", settings.autoDismissSeconds),
        setSetting("selectedAlgorithm", settings.selectedAlgorithm),
        setSetting("databaseMode", settings.databaseMode),
        setSetting("launchAtLogin", settings.launchAtLogin),
        setSetting("llmApiKey", settings.llmApiKey),
        setSetting("llmEndpoint", settings.llmEndpoint),
        setSetting("llmModelName", settings.llmModelName),
        setSetting("llmPromptTemplate", settings.llmPromptTemplate),
        setSetting("remoteDbHost", settings.remoteDbHost || ""),
        setSetting("remoteDbPort", settings.remoteDbPort || ""),
        setSetting("remoteDbUser", settings.remoteDbUser || ""),
        setSetting("remoteDbPassword", settings.remoteDbPassword || ""),
        setSetting("remoteDbDatabase", settings.remoteDbDatabase || ""),
      ]);

      // Enable/disable autostart based on setting (no-op in web mode)
      try {
        if (settings.launchAtLogin) {
          await enableAutostart();
        } else {
          await disableAutostart();
        }
      } catch (autostartError) {
        console.error("Failed to update autostart:", autostartError);
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Settings saved but failed to update autostart.",
        });
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all settings to default values?")) return;
    
    setLoading(true);
    try {
      await resetToDefaults();
      await loadSettings();
      toast({
        title: "Settings reset",
        description: "All settings have been restored to defaults.",
      });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestLLM = async () => {
    setTestingLLM(true);
    try {
      if (settings) {
        await setSetting("llmEndpoint", settings.llmEndpoint);
        await setSetting("llmApiKey", settings.llmApiKey);
        await setSetting("llmModelName", settings.llmModelName);
        await setSetting("llmPromptTemplate", settings.llmPromptTemplate);
      }

      const result = await generateDefinition("reckless");
      toast({
        title: "LLM Test Successful",
        description: `Response: ${result.substring(0, 100)}...`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "LLM Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTestingLLM(false);
    }
  };

  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <div className="w-48 border-r bg-muted/30 p-4 space-y-1">
            <TabButton 
              active={activeTab === "general"} 
              onClick={() => setActiveTab("general")} 
              label="General" 
            />
            <TabButton 
              active={activeTab === "timing"} 
              onClick={() => setActiveTab("timing")} 
              label="Timing" 
            />
            <TabButton 
              active={activeTab === "algorithm"} 
              onClick={() => setActiveTab("algorithm")} 
              label="Algorithm" 
            />
            <TabButton 
              active={activeTab === "database"} 
              onClick={() => setActiveTab("database")} 
              label="Database" 
            />
            <TabButton 
              active={activeTab === "llm"} 
              onClick={() => setActiveTab("llm")} 
              label="LLM API" 
            />
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">General Settings</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="launchAtLogin"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={settings.launchAtLogin}
                    onChange={(e) => setSettings({ ...settings, launchAtLogin: e.target.checked })}
                  />
                  <label htmlFor="launchAtLogin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Launch at Login
                  </label>
                </div>
              </div>
            )}

            {activeTab === "timing" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Timing Configuration</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label htmlFor="popupInterval" className="text-sm font-medium">Popup Interval (minutes)</label>
                    <span className="text-sm text-muted-foreground">{settings.popupIntervalMinutes} min</span>
                  </div>
                  <input
                    id="popupInterval"
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    value={settings.popupIntervalMinutes}
                    onChange={(e) => setSettings({ ...settings, popupIntervalMinutes: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">How often the review popup appears.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label htmlFor="autoDismiss" className="text-sm font-medium">Auto-dismiss (seconds)</label>
                    <span className="text-sm text-muted-foreground">{settings.autoDismissSeconds} sec</span>
                  </div>
                  <input
                    id="autoDismiss"
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    value={settings.autoDismissSeconds}
                    onChange={(e) => setSettings({ ...settings, autoDismissSeconds: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Time before the popup automatically closes.</p>
                </div>
              </div>
            )}

            {activeTab === "algorithm" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Spaced Repetition Algorithm</h3>
                <div className="grid grid-cols-1 gap-4">
                  <Card 
                    className={`cursor-pointer border-2 transition-all ${settings.selectedAlgorithm === "sm2" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    onClick={() => setSettings({ ...settings, selectedAlgorithm: "sm2" })}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="mt-1">
                        <input
                          type="radio"
                          checked={settings.selectedAlgorithm === "sm2"}
                          onChange={() => {}}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                      </div>
                      <div>
                        <div className="font-semibold">SuperMemo 2 (SM-2)</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Standard algorithm used by Anki. Optimizes for long-term retention using an ease factor.
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer border-2 transition-all ${settings.selectedAlgorithm === "leitner" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    onClick={() => setSettings({ ...settings, selectedAlgorithm: "leitner" })}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="mt-1">
                        <input
                          type="radio"
                          checked={settings.selectedAlgorithm === "leitner"}
                          onChange={() => {}}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                      </div>
                      <div>
                        <div className="font-semibold">Leitner System</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Simpler "boxes" system. Moves cards to higher boxes on success, back to start on failure.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "database" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Database Connection</h3>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dbMode"
                      value="local"
                      checked={settings.databaseMode === "local"}
                      onChange={() => setSettings({ ...settings, databaseMode: "local" })}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="font-medium">Local (SQLite)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dbMode"
                      value="remote"
                      checked={settings.databaseMode === "remote"}
                      onChange={() => setSettings({ ...settings, databaseMode: "remote" })}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="font-medium">Remote (PostgreSQL)</span>
                  </label>
                </div>

                {settings.databaseMode === "remote" && (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="remoteDbHost" className="text-sm font-medium">Host</label>
                        <Input 
                          id="remoteDbHost"
                          value={settings.remoteDbHost || ""} 
                          onChange={(e) => setSettings({ ...settings, remoteDbHost: e.target.value })}
                          placeholder="localhost"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="remoteDbPort" className="text-sm font-medium">Port</label>
                        <Input 
                          id="remoteDbPort"
                          value={settings.remoteDbPort || ""} 
                          onChange={(e) => setSettings({ ...settings, remoteDbPort: e.target.value })}
                          placeholder="5432"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="remoteDbDatabase" className="text-sm font-medium">Database Name</label>
                      <Input 
                        id="remoteDbDatabase"
                        value={settings.remoteDbDatabase || ""} 
                        onChange={(e) => setSettings({ ...settings, remoteDbDatabase: e.target.value })}
                        placeholder="memcycle"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="remoteDbUser" className="text-sm font-medium">User</label>
                        <Input 
                          id="remoteDbUser"
                          value={settings.remoteDbUser || ""} 
                          onChange={(e) => setSettings({ ...settings, remoteDbUser: e.target.value })}
                          placeholder="postgres"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="remoteDbPassword" className="text-sm font-medium">Password</label>
                        <Input 
                          id="remoteDbPassword"
                          type="password"
                          value={settings.remoteDbPassword || ""} 
                          onChange={(e) => setSettings({ ...settings, remoteDbPassword: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "llm" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">LLM API Configuration</h3>
                
                <div className="space-y-2">
                  <label htmlFor="llmEndpoint" className="text-sm font-medium">API Endpoint</label>
                  <Input 
                    id="llmEndpoint"
                    value={settings.llmEndpoint} 
                    onChange={(e) => setSettings({ ...settings, llmEndpoint: e.target.value })}
                    placeholder="https://api.openai.com/v1/chat/completions"
                  />
                  <p className="text-xs text-muted-foreground">The full URL to the chat completions endpoint.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="llmApiKey" className="text-sm font-medium">API Key</label>
                  <Input 
                    id="llmApiKey"
                    type="password"
                    value={settings.llmApiKey} 
                    onChange={(e) => setSettings({ ...settings, llmApiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="llmModelName" className="text-sm font-medium">Model Name</label>
                  <Input 
                    id="llmModelName"
                    value={settings.llmModelName} 
                    onChange={(e) => setSettings({ ...settings, llmModelName: e.target.value })}
                    placeholder="gpt-4o-mini"
                  />
                  <p className="text-xs text-muted-foreground">The model to use for completions (e.g., gpt-4o-mini, gpt-4, claude-3-sonnet)</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="llmPromptTemplate" className="text-sm font-medium">Prompt Template</label>
                  <textarea 
                    id="llmPromptTemplate"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.llmPromptTemplate}
                    onChange={(e) => setSettings({ ...settings, llmPromptTemplate: e.target.value })}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Use {"{{word}}"} as a placeholder for the word to define.</p>
                </div>

                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleTestLLM} 
                    disabled={testingLLM || !settings.llmApiKey || !settings.llmEndpoint}
                  >
                    {testingLLM ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Test Connection
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-background">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-destructive">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
