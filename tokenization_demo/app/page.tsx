
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@/stores/simulationStore';
import GraphVisualization from '@/components/graph/GraphVisualization';
import NodeInspectorModal from '@/components/modals/NodeInspectorModal';
import TokenInspectorModal from '@/components/modals/TokenInspectorModal';
import GlobalLedgerModal from '@/components/modals/GlobalLedgerModal'; // New Import
import { Play, Pause, StepForward, AlertCircle, RefreshCw, Edit, BookOpen } from 'lucide-react'; // Added BookOpen
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Home() {
  const {
    loadScenario,
    play,
    pause,
    stepForward,
    tick,
    isRunning,
    currentTime,
    errorMessages,
    clearErrors,
    simulationSpeed,
    scenario,
    toggleGlobalLedger, // New from store
  } = useSimulationStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isScenarioEditorOpen, setIsScenarioEditorOpen] = useState(false);
  const [scenarioEditText, setScenarioEditText] = useState<string>('');
  const [defaultScenarioContent, setDefaultScenarioContent] = useState<string>('');


  const fetchDefaultScenarioContent = useCallback(async () => {
    try {
      const res = await fetch('/scenario.json');
      if (!res.ok) {
        throw new Error(`Failed to fetch default scenario: ${res.statusText}`);
      }
      const data = await res.json();
      const stringifiedData = JSON.stringify(data, null, 2);
      setDefaultScenarioContent(stringifiedData);
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
    clearErrors();
    const defaultScenarioData = await fetchDefaultScenarioContent();
    if (defaultScenarioData) {
      setScenarioEditText(JSON.stringify(defaultScenarioData, null, 2));
      await loadScenario(defaultScenarioData);
    } else {
      useSimulationStore.setState({ errorMessages: [...useSimulationStore.getState().errorMessages, 'Failed to load default scenario content. Simulation may not work correctly.']});
    }
    setIsLoading(false);
  }, [loadScenario, clearErrors, fetchDefaultScenarioContent]);


  useEffect(() => {
    initialLoadScenario();
  }, [initialLoadScenario]);

  useEffect(() => {
    if (errorMessages.length > 0) {
      errorMessages.forEach((msg, index) => {
        toast({
          variant: "destructive",
          title: `Error ${index + 1}`,
          description: msg,
        });
      });
    }
  }, [errorMessages, toast]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => {
        tick();
      }, 1000 / simulationSpeed);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, tick, simulationSpeed]);

  const handleReloadDefaultScenario = () => {
    initialLoadScenario();
     toast({ title: "Default Scenario Reloaded", description: "The default scenario has been reloaded." });
  };

  const handleApplyScenarioFromEditor = async () => {
    setIsLoading(true);
    clearErrors();
    try {
      const jsonData = JSON.parse(scenarioEditText);
      await loadScenario(jsonData);
      
      const storeErrors = useSimulationStore.getState().errorMessages;
      if (storeErrors.length === 0) {
        toast({ title: "Success", description: "Scenario loaded from editor." });
        setDefaultScenarioContent(scenarioEditText);
        setIsScenarioEditorOpen(false);
      }

    } catch (err: any) {
      console.error("Error loading scenario from editor:", err);
      let errorTitle = "Load Error";
      let detailedMessage = `Failed to parse or load scenario from editor.`;

      if (err instanceof SyntaxError) {
        errorTitle = "JSON Syntax Error";
        detailedMessage = `Invalid JSON: ${err.message}. Please check for issues like misplaced commas or brackets.`;
      } else if (err instanceof Error) {
        detailedMessage = `Error loading scenario: ${err.message}`;
      } else {
        detailedMessage = `An unknown error occurred while loading the scenario.`;
      }
      
      useSimulationStore.setState(state => ({ errorMessages: [...state.errorMessages, detailedMessage]}));
    } finally {
      setIsLoading(false);
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

  if (isLoading && !scenario) {
    return <div className="flex items-center justify-center h-screen"><RefreshCw className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4 text-xl">Loading Scenario...</span></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="p-4 border-b border-border shadow-sm bg-card">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-headline font-semibold text-primary">Tokenize Simulation</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={toggleGlobalLedger} variant="outline" size="sm">
              <BookOpen className="mr-2 h-4 w-4" /> Global Ledger
            </Button>
            <Button onClick={() => setIsScenarioEditorOpen(true)} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit Scenario
            </Button>
            <Button onClick={handleReloadDefaultScenario} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reload Default
            </Button>
            <Button onClick={isRunning ? pause : play} variant="default" size="sm">
              {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isRunning ? 'Pause' : 'Play'}
            </Button>
            <Button onClick={() => stepForward()} variant="outline" size="sm" disabled={isRunning}>
              <StepForward className="mr-2 h-4 w-4" /> Step (1s)
            </Button>
            <div className="text-sm tabular-nums p-2 rounded-md bg-muted">
              Time: <span className="font-semibold">{currentTime.toFixed(0)}s</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex relative overflow-hidden">
        <GraphVisualization />
      </main>

      {errorMessages.length > 0 && (
         <div className="fixed bottom-4 right-4 w-1/3 max-h-1/3 z-50 bg-destructive/10 border border-destructive text-destructive-foreground p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Errors</h3>
              <Button variant="ghost" size="sm" onClick={clearErrors}>Clear</Button>
            </div>
            <ScrollArea className="h-full max-h-48">
              <ul className="space-y-1 text-sm">
                {errorMessages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
      )}

      <NodeInspectorModal />
      <TokenInspectorModal />
      <GlobalLedgerModal /> {/* New Modal */}

      <Dialog open={isScenarioEditorOpen} onOpenChange={setIsScenarioEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Scenario JSON</DialogTitle>
            <DialogDescription>
              Modify the scenario configuration directly. Invalid JSON or schema will cause errors on apply.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow py-4 overflow-hidden">
            <Label htmlFor="scenario-editor-textarea" className="sr-only">Scenario JSON</Label>
            <Textarea
              id="scenario-editor-textarea"
              value={scenarioEditText}
              onChange={(e) => setScenarioEditText(e.target.value)}
              placeholder="Paste or edit scenario JSON here..."
              className="w-full h-full font-mono text-xs min-h-[400px] resize-none"
            />
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleResetEditorToDefault} disabled={isLoading}>
              Reset to Default
            </Button>
            <Button onClick={handleApplyScenarioFromEditor} disabled={isLoading}>
              {isLoading ? 'Applying...' : 'Apply Scenario Changes'}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    