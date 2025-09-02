'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@/stores/simulationStore';
import GraphVisualization from '@/components/graph/GraphVisualization';
import NodeInspectorModal from '@/components/modals/NodeInspectorModal';
import TokenInspectorModal from '@/components/modals/TokenInspectorModal';
import GlobalLedgerModal from '@/components/modals/GlobalLedgerModal';
import { Play, Pause, StepForward, AlertCircle, RefreshCw, Edit, BookOpen } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function TemplateEditorPage() {
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const play = useSimulationStore(state => state.play);
  const pause = useSimulationStore(state => state.pause);
  const stepForward = useSimulationStore(state => state.stepForward);
  const tick = useSimulationStore(state => state.tick);
  const isRunning = useSimulationStore(state => state.isRunning);
  const currentTime = useSimulationStore(state => state.currentTime);
  const errorMessages = useSimulationStore(state => state.errorMessages);
  const clearErrors = useSimulationStore(state => state.clearErrors);
  const simulationSpeed = useSimulationStore(state => state.simulationSpeed);
  const scenario = useSimulationStore(state => state.scenario);
  const toggleGlobalLedger = useSimulationStore(state => state.toggleGlobalLedger);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isScenarioEditorOpen, setIsScenarioEditorOpen] = useState(false);
  const [scenarioEditText, setScenarioEditText] = useState<string>('');
  const [defaultScenarioContent, setDefaultScenarioContent] = useState<string>('');
  const lastErrorCountRef = useRef(0);

  const fetchDefaultScenarioContent = useCallback(async () => {
    try {
      const response = await fetch('/scenario.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching default scenario content:", err);
      toast({ variant: "destructive", title: "Fetch Error", description: `Could not fetch default scenario.json: ${err instanceof Error ? err.message : String(err)}` });
      setDefaultScenarioContent('');
      return null;
    }
  }, [toast]);

  const initialLoadScenario = useCallback(async () => {
    setIsLoading(true);
    const defaultData = await fetchDefaultScenarioContent();
    if (defaultData) {
      setDefaultScenarioContent(JSON.stringify(defaultData, null, 2));
      await loadScenario(defaultData);
    }
    setIsLoading(false);
  }, [fetchDefaultScenarioContent, loadScenario]);

  useEffect(() => {
    initialLoadScenario();
  }, [initialLoadScenario]);

  useEffect(() => {
    if (errorMessages.length > lastErrorCountRef.current) {
      // Only show new errors
      for (let i = lastErrorCountRef.current; i < errorMessages.length; i++) {
        const msg = errorMessages[i];
        toast({
          variant: "destructive",
          title: `Error ${i + 1}`,
          description: msg,
        });
      }
      lastErrorCountRef.current = errorMessages.length;
    } else if (errorMessages.length === 0) {
      // Reset counter when errors are cleared
      lastErrorCountRef.current = 0;
    }
  }, [errorMessages, toast]);

  const handleReloadDefaultScenario = () => {
    initialLoadScenario();
    toast({ title: "Default Scenario Reloaded", description: "The default scenario has been reloaded." });
  };

  const handleOpenScenarioEditor = () => {
    setScenarioEditText(defaultScenarioContent);
    setIsScenarioEditorOpen(true);
  };

  const handleLoadScenarioFromEditor = async () => {
    try {
      const parsedScenario = JSON.parse(scenarioEditText);
      await loadScenario(parsedScenario);
      const storeErrors = errorMessages;
      if (storeErrors.length === 0) {
        toast({ title: "Success", description: "Scenario loaded from editor." });
        setDefaultScenarioContent(scenarioEditText);
        setIsScenarioEditorOpen(false);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "JSON Parse Error", description: `Invalid JSON: ${e.message}` });
    }
  };

  const handleResetEditorToDefault = async () => {
    const defaultData = await fetchDefaultScenarioContent();
    if (defaultData) {
      setScenarioEditText(JSON.stringify(defaultData, null, 2));
      toast({ title: "Editor Reset", description: "Scenario editor reset to default content." });
    } else {
      toast({ variant: "destructive", title: "Reset Error", description: "Could not re-fetch default scenario for reset." });
    }
  };

  const handlePlayPause = () => {
    if (isRunning) {
      pause();
    } else {
      play();
    }
  };

  const handleStepForward = () => {
    stepForward(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border shadow-sm bg-card">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-primary">Template Editor - Simulation</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={toggleGlobalLedger}>
              <BookOpen className="mr-2 h-4 w-4" /> Global Ledger
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenScenarioEditor}>
              <Edit className="mr-2 h-4 w-4" /> Edit Scenario
            </Button>
            <Button variant="outline" size="sm" onClick={handleReloadDefaultScenario}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reload Default
            </Button>
            <Button 
              variant={isRunning ? "destructive" : "default"} 
              size="sm" 
              onClick={handlePlayPause}
            >
              {isRunning ? (
                <><Pause className="mr-2 h-4 w-4" /> Pause</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Play</>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleStepForward} disabled={isRunning}>
              <StepForward className="mr-2 h-4 w-4" /> Step (1s)
            </Button>
            <div className="text-sm tabular-nums p-2 rounded-md bg-muted">
              Time: <span className="font-semibold">{currentTime}s</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex relative overflow-hidden">
        {errorMessages.length > 0 && (
          <div className="absolute top-4 left-4 z-10 bg-destructive/90 text-destructive-foreground p-3 rounded-md shadow-lg max-w-md">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="font-semibold">Simulation Errors ({errorMessages.length})</span>
            </div>
            <ScrollArea className="max-h-32 mt-2">
              <ul className="text-sm space-y-1">
                {errorMessages.map((msg, index) => (
                  <li key={index}>• {msg}</li>
                ))}
              </ul>
            </ScrollArea>
            <Button variant="outline" size="sm" className="mt-2" onClick={clearErrors}>
              Clear Errors
            </Button>
          </div>
        )}

        <div className="flex-grow">
          <GraphVisualization />
        </div>
      </main>

      {/* Scenario Editor Modal */}
      <Dialog open={isScenarioEditorOpen} onOpenChange={setIsScenarioEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Scenario JSON</DialogTitle>
            <DialogDescription>
              Modify the scenario configuration. Changes will be applied when you click "Load Scenario".
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <Label htmlFor="scenario-editor" className="text-sm font-medium">
              Scenario Configuration (JSON)
            </Label>
            <Textarea
              id="scenario-editor"
              value={scenarioEditText}
              onChange={(e) => setScenarioEditText(e.target.value)}
              className="mt-2 font-mono text-sm h-96 resize-none"
              placeholder="Enter scenario JSON here..."
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleResetEditorToDefault}>
              Reset to Default
            </Button>
            <div className="space-x-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleLoadScenarioFromEditor}>Load Scenario</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <NodeInspectorModal />
      <TokenInspectorModal />
      <GlobalLedgerModal />
    </div>
  );
}