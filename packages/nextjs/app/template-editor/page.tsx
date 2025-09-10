"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import GraphVisualization from "@/components/graph/GraphVisualization";
import GlobalLedgerModal from "@/components/modals/GlobalLedgerModal";
import NodeInspectorModal from "@/components/modals/NodeInspectorModal";
import TokenInspectorModal from "@/components/modals/TokenInspectorModal";
import IntegratedAIAssistant from "@/components/ai/IntegratedAIAssistant";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSimulationStore } from "@/stores/simulationStore";
import { AlertCircle, BookOpen, Edit, Pause, Play, RefreshCw, StepForward, Brain, Eye, EyeOff } from "lucide-react";
import { cn } from "~~/lib/utils";

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
  const [scenarioEditText, setScenarioEditText] = useState<string>("");
  const [defaultScenarioContent, setDefaultScenarioContent] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [aiPanelWidth, setAIPanelWidth] = useState(320);
  const [isAIPanelVisible, setIsAIPanelVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const lastErrorCountRef = useRef(0);

  const fetchDefaultScenarioContent = useCallback(async () => {
    try {
      const response = await fetch("/scenario.json");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching default scenario content:", err);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: `Could not fetch default scenario.json: ${err instanceof Error ? err.message : String(err)}`,
      });
      setDefaultScenarioContent("");
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
    // Ensure page starts at top on reload
    window.scrollTo(0, 0);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 250 && newWidth <= 600) {
      setAIPanelWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
      toast({
        variant: "destructive",
        title: "Reset Error",
        description: "Could not re-fetch default scenario for reset.",
      });
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
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <header className="px-6 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-slate-800">Template Editor</h1>
            
            {/* Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setIsEditMode(false)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  !isEditMode 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                <div className="flex items-center space-x-2">
                  <Play className="h-4 w-4" />
                  <span>Simulation</span>
                </div>
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  isEditMode 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                <div className="flex items-center space-x-2">
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </div>
              </button>
            </div>

            {/* Status Badge */}
            {!isEditMode && (
              <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700">Live Simulation</span>
              </div>
            )}

            {isEditMode && (
              <div className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-700">JSON Editor</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Simulation Mode Controls */}
            {!isEditMode && (
              <>
                <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                  <span className="font-mono">Time: {currentTime}s</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handlePlayPause} 
                    className={cn(
                      "font-medium transition-all",
                      isRunning 
                        ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                        : "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                    )}>
                    {isRunning ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Play
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={handleStepForward} disabled={isRunning}
                    className="border-slate-300 hover:bg-slate-50">
                    <StepForward className="mr-2 h-4 w-4" /> Step
                  </Button>
                </div>
                
                <div className="h-6 w-px bg-slate-300"></div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={toggleGlobalLedger}
                    className="border-slate-300 hover:bg-slate-50">
                    <BookOpen className="mr-2 h-4 w-4" /> Ledger
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReloadDefaultScenario}
                    className="border-slate-300 hover:bg-slate-50">
                    <RefreshCw className="mr-2 h-4 w-4" /> Reload
                  </Button>
                </div>
              </>
            )}

            {/* Edit Mode Controls */}
            {isEditMode && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleOpenScenarioEditor}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Edit className="mr-2 h-4 w-4" /> Open JSON Editor
                </Button>
                <Button variant="outline" size="sm" onClick={handleReloadDefaultScenario}
                  className="border-slate-300 hover:bg-slate-50">
                  <RefreshCw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Graph Visualization Area */}
        <div className="flex-grow transition-all duration-300 relative bg-white">
          {errorMessages.length > 0 && (
            <div className="absolute top-4 left-4 z-10 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg shadow-lg max-w-md">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                <span className="font-semibold">Simulation Errors ({errorMessages.length})</span>
              </div>
              <ScrollArea className="max-h-32">
                <ul className="text-sm space-y-1">
                  {errorMessages.map((msg, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-1">•</span> 
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <Button variant="outline" size="sm" className="mt-3 border-red-300 text-red-700 hover:bg-red-50" onClick={clearErrors}>
                Clear Errors
              </Button>
            </div>
          )}

          {/* AI Panel Toggle Button */}
          <button
            onClick={() => setIsAIPanelVisible(!isAIPanelVisible)}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center transition-colors"
          >
            {isAIPanelVisible ? (
              <EyeOff className="h-4 w-4 text-slate-600" />
            ) : (
              <Eye className="h-4 w-4 text-slate-600" />
            )}
          </button>

          <div className="h-full w-full">
            <GraphVisualization />
          </div>
        </div>

        {/* Resizer */}
        {isAIPanelVisible && (
          <div
            className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize flex-shrink-0 transition-colors relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-0 w-2 -translate-x-0.5 group-hover:bg-slate-400 transition-colors"></div>
          </div>
        )}

        {/* AI Assistant Integrated Panel */}
        {isAIPanelVisible && (
          <div 
            className="border-l border-slate-200 bg-white flex flex-col"
            style={{ width: `${aiPanelWidth}px` }}
          >
          <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-sm">
                <Brain className="h-4 w-4 text-white" />
              </div>
            </div>
            
          </div>
          
            <IntegratedAIAssistant 
              className="flex-1" 
              isEditMode={isEditMode}
              scenarioContent={defaultScenarioContent}
              onScenarioUpdate={(newScenario) => {
                setDefaultScenarioContent(newScenario);
                try {
                  const parsedScenario = JSON.parse(newScenario);
                  loadScenario(parsedScenario);
                  toast({ title: "Success", description: "Scenario updated automatically by AI" });
                } catch (error) {
                  toast({ 
                    variant: "destructive", 
                    title: "JSON Error", 
                    description: "AI generated invalid JSON" 
                  });
                }
              }}
            />
          </div>
        )}
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
              onChange={e => setScenarioEditText(e.target.value)}
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
