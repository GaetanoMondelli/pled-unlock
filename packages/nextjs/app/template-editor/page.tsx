"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GraphVisualization from "@/components/graph/GraphVisualization";
import GlobalLedgerModal from "@/components/modals/GlobalLedgerModal";
import NodeInspectorModal from "@/components/modals/NodeInspectorModal";
import TokenInspectorModal from "@/components/modals/TokenInspectorModal";
import TemplateManagerModal from "@/components/modals/TemplateManagerModal";
import ExecutionManagerModal from "@/components/modals/ExecutionManagerModal";
import ScenarioManagerModal from "@/components/modals/ScenarioManagerModal";
import ModelUpgradeModal from "@/components/modals/ModelUpgradeModal";
import JsonViewModal from "@/components/modals/JsonViewModal";
import IntegratedAIAssistant from "@/components/ai/IntegratedAIAssistant";
import NodeLibraryPanel from "@/components/library/NodeLibraryPanel";
import ImprovedGroupManagementPanel from "@/components/graph/ImprovedGroupManagementPanel";
import StateInspectorPanel from "@/components/ui/state-inspector-panel";
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
import { useEventSourcing, setupEventSourcingIntegration } from "@/stores/eventSourcingStore";
import { AlertCircle, BookOpen, Edit, Pause, Play, RefreshCw, StepForward, Brain, Eye, EyeOff, Activity, Library, Undo2, Redo2, FileText, Archive, ScrollText, Group, Zap, ArrowUp, Code, RotateCcw, ChevronDown, Save, Loader2 } from "lucide-react";
import { cn } from "~~/lib/utils";

export default function TemplateEditorPage() {
  const router = useRouter();
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
  const undo = useSimulationStore(state => state.undo);
  const redo = useSimulationStore(state => state.redo);
  const canUndo = useSimulationStore(state => state.canUndo);
  const canRedo = useSimulationStore(state => state.canRedo);
  const currentTemplate = useSimulationStore(state => state.currentTemplate);
  const currentExecution = useSimulationStore(state => state.currentExecution);
  const loadTemplates = useSimulationStore(state => state.loadTemplates);
  const updateCurrentTemplate = useSimulationStore(state => state.updateCurrentTemplate);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isScenarioEditorOpen, setIsScenarioEditorOpen] = useState(false);
  const [scenarioEditText, setScenarioEditText] = useState<string>("");
  const [defaultScenarioContent, setDefaultScenarioContent] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [aiPanelWidth, setAIPanelWidth] = useState(320);
  const [isAIPanelVisible, setIsAIPanelVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isStateInspectorOpen, setIsStateInspectorOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<'ai' | 'library' | 'groups'>('ai');
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isExecutionManagerOpen, setIsExecutionManagerOpen] = useState(false);
  const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState(false);
  const [isModelUpgradeOpen, setIsModelUpgradeOpen] = useState(false);
  const [isJsonViewOpen, setIsJsonViewOpen] = useState(false);
  const lastErrorCountRef = useRef(0);

  // Event sourcing hooks
  const { isRecording, currentScenario, availableScenarios } = useEventSourcing();

  // Simple debugging functions
  const handleResetAllEvents = () => {
    if (confirm("Reset simulation? This will delete ALL events and restart from scratch.")) {
      // Clear all events and reset simulation
      clearErrors();
      toast({
        title: "Simulation Reset",
        description: "All events cleared. Simulation restarted.",
      });
    }
  };

  const handleReloadFromExternalEvents = () => {
    if (confirm("Reload from external events? This will delete execution events and replay from external events only.")) {
      const externalCount = globalActivityLog.filter(e => e.eventType === 'external_event').length;

      toast({
        title: "Reloaded from External Events",
        description: `Kept ${externalCount} external events, deleted execution events. Ready to replay.`,
      });
    }
  };

  const fetchDefaultScenarioContent = useCallback(async () => {
    try {
      console.log("Fetching scenario.json...");

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("/scenario.json", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Successfully fetched scenario.json");
      return data;
    } catch (err) {
      console.error("Error fetching default scenario content:", err);

      if (err instanceof Error && err.name === 'AbortError') {
        toast({
          variant: "destructive",
          title: "Timeout Error",
          description: "Loading scenario.json timed out. Please refresh the page.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fetch Error",
          description: `Could not fetch default scenario.json: ${err instanceof Error ? err.message : String(err)}`,
        });
      }

      setDefaultScenarioContent("");
      return null;
    }
  }, [toast]);

  const initialLoadScenario = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Starting initial scenario load...");
      const defaultData = await fetchDefaultScenarioContent();
      if (defaultData) {
        console.log("Fetched scenario data, setting content...");
        setDefaultScenarioContent(JSON.stringify(defaultData, null, 2));
        console.log("Loading scenario into store...");
        await loadScenario(defaultData);
        console.log("Scenario loaded successfully");
      } else {
        console.warn("No default scenario data found, creating minimal scenario");
        // Create a minimal fallback scenario
        const fallbackScenario = {
          version: "3.0",
          nodes: [
            {
              nodeId: "source1",
              type: "DataSource",
              displayName: "Token Source",
              position: { x: 100, y: 100 },
              interval: 5,
              generation: { type: "random", valueMin: 1, valueMax: 10 },
              outputs: [{ destinationNodeId: "sink1" }],
            },
            {
              nodeId: "sink1",
              type: "Sink",
              displayName: "Token Sink",
              position: { x: 400, y: 100 },
              inputs: [{ nodeId: "source1" }],
            },
          ],
        };
        setDefaultScenarioContent(JSON.stringify(fallbackScenario, null, 2));
        await loadScenario(fallbackScenario);
        console.log("Fallback scenario loaded");
      }
    } catch (error) {
      console.error("Error in initial scenario load:", error);
      // Use toast directly without dependency
    }
    console.log("Setting loading to false");
    setIsLoading(false);
  }, [fetchDefaultScenarioContent, loadScenario]); // Removed toast dependency

  useEffect(() => {
    // Load available templates and check if we need to force template creation
    const loadOnce = async () => {
      setIsLoading(true);
      try {
        console.log("Loading available templates...");
        await loadTemplates();

        const templates = useSimulationStore.getState().availableTemplates;
        console.log("Templates loaded:", templates.length);

        if (templates.length === 0) {
          console.log("No templates found, opening template manager...");
          setIsTemplateManagerOpen(true);
        } else {
          // Auto-load the default template so the editor starts with something loaded
          const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
          if (defaultTemplate) {
            console.log(`Auto-loading template: ${defaultTemplate.name} (ID: ${defaultTemplate.id})`);
            try {
              const loadTemplate = useSimulationStore.getState().loadTemplate;
              await loadTemplate(defaultTemplate.id);
              console.log("Template loaded successfully");
            } catch (templateError) {
              console.error("Error loading default template:", templateError);
              // Continue anyway - user can manually select a template
            }
          }
        }
      } catch (error) {
        console.error("Error loading templates:", error);
        // If template loading fails, still allow user to work
      } finally {
        console.log("Setting loading to false");
        setIsLoading(false);
      }
    };

    loadOnce();
  }, []); // Empty dependency - run only once


  useEffect(() => {
    // Ensure page starts at top on reload
    window.scrollTo(0, 0);
  }, []);

  // Set up event sourcing integration
  useEffect(() => {
    setupEventSourcingIntegration();
    console.log("🔗 Event sourcing integration initialized");
  }, []);

  // Navigate to template slug URL when template is loaded
  useEffect(() => {
    if (currentTemplate) {
      const templateSlug = currentTemplate.name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
      const expectedPath = `/template-editor/${templateSlug}`;

      // Only navigate if we're not already on the correct template path
      if (window.location.pathname !== expectedPath) {
        router.push(expectedPath);
      }
    }
  }, [currentTemplate, router]);

  const [isSaving, setIsSaving] = useState(false);

  // Handler for navigating to a group (used by ImprovedGroupManagementPanel)
  const handleNavigateToGroup = useCallback((groupTag: string, groupNodes: any[]) => {
    // Update URL - GraphVisualization will react to this change
    const url = new URL(window.location.href);
    url.searchParams.set('group', groupTag);
    window.history.pushState({}, '', url.toString());
    // Trigger a custom event so GraphVisualization can react
    window.dispatchEvent(new CustomEvent('urlchange'));
  }, []);

  // Handler for navigating back to template view
  const handleNavigateBackToTemplate = useCallback(() => {
    // Remove group param from URL - GraphVisualization will react to this change
    const url = new URL(window.location.href);
    url.searchParams.delete('group');
    window.history.pushState({}, '', url.toString());
    // Trigger a custom event so GraphVisualization can react
    window.dispatchEvent(new CustomEvent('urlchange'));
  }, []);

  // Handler for saving current template
  const handleSaveTemplate = useCallback(async () => {
    if (!currentTemplate) {
      toast({
        variant: "destructive",
        title: "No template loaded",
        description: "Please load a template before trying to save changes.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateCurrentTemplate();
      toast({
        title: "Template saved",
        description: `Changes to "${currentTemplate.name}" have been saved successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: `Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentTemplate, updateCurrentTemplate, toast]);

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
    // Use current scenario from store instead of defaultScenarioContent
    const currentScenarioText = scenario ? JSON.stringify(scenario, null, 2) : defaultScenarioContent;
    setScenarioEditText(currentScenarioText);
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

        // Auto-save the changes to the current template if one is loaded
        if (currentTemplate) {
          try {
            await updateCurrentTemplate();
            toast({ title: "Template Saved", description: `Changes saved to "${currentTemplate.name}"` });
          } catch (saveError) {
            console.error("Error auto-saving template:", saveError);
            toast({
              variant: "destructive",
              title: "Save Warning",
              description: "Scenario loaded but failed to save to template. Use File > Save Template to save manually."
            });
          }
        }
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Professional B2B Toolbar */}
      <header className="bg-white border-b border-gray-300 flex-shrink-0">
        {/* Menu Bar Style Toolbar */}
        <div className="h-12 px-4 flex items-center justify-between bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-6">
            <h1 className="text-sm font-medium text-gray-700 select-none">Template Editor</h1>

            {/* Menu Items */}
            <div className="flex items-center">
              {/* File Menu */}
              <div className="relative group">
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  File
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <button
                      onClick={() => setIsTemplateManagerOpen(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Templates...
                    </button>
                    <button
                      onClick={() => setIsExecutionManagerOpen(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Executions...
                    </button>
                    {currentTemplate && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleSaveTemplate}
                          disabled={isSaving}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              Save Template
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Menu */}
              <div className="relative group">
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  Edit
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <button
                      onClick={undo}
                      disabled={!canUndo() || isRunning}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center">
                        <Undo2 className="w-4 h-4 mr-2" />
                        Undo
                      </span>
                      <span className="text-xs text-gray-400">Ctrl+Z</span>
                    </button>
                    <button
                      onClick={redo}
                      disabled={!canRedo() || isRunning}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center">
                        <Redo2 className="w-4 h-4 mr-2" />
                        Redo
                      </span>
                      <span className="text-xs text-gray-400">Ctrl+Y</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View Menu */}
              <div className="relative group">
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  View
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <button
                      onClick={toggleGlobalLedger}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Activity Ledger
                    </button>
                    <button
                      onClick={() => setIsStateInspectorOpen(!isStateInspectorOpen)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      State Inspector
                    </button>
                    <button
                      onClick={() => setSidePanelMode('library')}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Library className="w-4 h-4 mr-2" />
                      Node Library
                    </button>
                    <button
                      onClick={() => setSidePanelMode('groups')}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Group className="w-4 h-4 mr-2" />
                      Groups & Tags
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => setIsJsonViewOpen(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      View JSON Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Tools Menu */}
              <div className="relative group">
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  Tools
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <button
                      onClick={() => setIsModelUpgradeOpen(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Model Upgrade
                      {currentScenario && <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center ml-4 bg-white border border-gray-300 rounded">
                <button
                  onClick={() => setIsEditMode(false)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors border-r border-gray-300",
                    !isEditMode
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Simulation
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    isEditMode
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* Right side info */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {currentTemplate && (
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                {currentTemplate.name}
                {currentTemplate.executionState && (
                  <span className="ml-2 text-xs text-blue-600">● Saved</span>
                )}
              </span>
            )}
            {!isEditMode && (
              <span className="font-mono text-xs">
                Time: {currentTime}s
              </span>
            )}
          </div>
        </div>

        {/* Simulation Controls Toolbar */}
        {!isEditMode && (
          <div className="h-10 px-4 flex items-center justify-between bg-white border-b border-gray-200">
            <div className="flex items-center space-x-1">
              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded transition-colors flex items-center",
                  isRunning
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3 h-3 mr-1" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" /> Play
                  </>
                )}
              </button>

              {/* Step Button */}
              <button
                onClick={handleStepForward}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center disabled:opacity-50"
              >
                <StepForward className="w-3 h-3 mr-1" /> Step
              </button>

              <div className="w-px h-4 bg-gray-300 mx-2"></div>

              {/* Debugging Controls */}
              <div className="relative group">
                <button className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center">
                  <Archive className="w-3 h-3 mr-1" />
                  {currentExecution ? currentExecution.name : currentScenario ? currentScenario.name : 'No execution'}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <button
                      onClick={() => setIsExecutionManagerOpen(true)}
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Archive className="w-3 h-3 mr-2" />
                      Manage Executions...
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleResetAllEvents}
                      className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      Reset (Delete All)
                    </button>
                    <button
                      onClick={handleReloadFromExternalEvents}
                      className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Reload from External Events
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-px h-4 bg-gray-300 mx-2"></div>

              {/* Reload Button */}
              <button
                onClick={handleReloadDefaultScenario}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Reload
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {!isEditMode && <span className="animate-pulse text-green-600">● Live</span>}
              {isEditMode && <span className="text-blue-600">● Edit Mode</span>}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Graph Visualization Area */}
        <div className="flex-grow transition-all duration-300 relative bg-white overflow-hidden">
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

          {/* Panel Visibility Toggle Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsAIPanelVisible(!isAIPanelVisible)}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center transition-colors"
            >
              {isAIPanelVisible ? (
                <EyeOff className="h-4 w-4 text-slate-600" />
              ) : (
                <Eye className="h-4 w-4 text-slate-600" />
              )}
            </button>
          </div>

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

        {/* Side Panel (AI Assistant, Node Library, or Ledger) */}
        {isAIPanelVisible && (
          <div
            className="border-l border-slate-200 bg-white flex flex-col min-h-0"
            style={{
              width: `${aiPanelWidth}px`,
              minWidth: `${aiPanelWidth}px`,
              maxWidth: `${aiPanelWidth}px`
            }}
          >
            {/* Panel Header with Toggle Buttons */}
            <div className="border-b border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex items-center justify-center p-2">
                <div className="flex bg-white border border-slate-200 rounded-lg shadow-sm">
                  <button
                    onClick={() => setSidePanelMode('ai')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-l-lg transition-all flex items-center gap-2",
                      sidePanelMode === 'ai'
                        ? "bg-slate-600 text-white"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <Brain className="h-3 w-3" />
                    AI
                  </button>
                  <button
                    onClick={() => setSidePanelMode('library')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-2 border-l border-slate-200",
                      sidePanelMode === 'library'
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <Library className="h-3 w-3" />
                    Library
                  </button>
                  <button
                    onClick={() => setSidePanelMode('groups')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-r-lg transition-all flex items-center gap-2 border-l border-slate-200",
                      sidePanelMode === 'groups'
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <Group className="h-3 w-3" />
                    Groups
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {sidePanelMode === 'ai' && (
                <IntegratedAIAssistant
                  className="flex-1 min-h-0"
                  isEditMode={isEditMode}
                  scenarioContent={scenario ? JSON.stringify(scenario, null, 2) : defaultScenarioContent}
                  onScenarioUpdate={(newScenario) => {
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
              )}

              {sidePanelMode === 'library' && (
                <NodeLibraryPanel
                  className="flex-1"
                  onNodeDrop={(nodeType, position) => {
                    // TODO: Implement node drop functionality
                    console.log('Node drop:', nodeType, position);
                  }}
                />
              )}

              {sidePanelMode === 'groups' && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="px-3 py-2 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        <Group className="h-4 w-4" />
                        Groups & Tags
                      </h3>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ImprovedGroupManagementPanel
                      className="h-full p-3"
                      onNavigateToGroup={handleNavigateToGroup}
                    />
                  </div>
                </div>
              )}
            </div>
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

      {/* State Inspector Panel */}
      <StateInspectorPanel 
        isOpen={isStateInspectorOpen} 
        onClose={() => setIsStateInspectorOpen(false)} 
      />

      {/* Modals */}
      <NodeInspectorModal />
      <TokenInspectorModal />
      <GlobalLedgerModal />
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
      />
      <ExecutionManagerModal
        isOpen={isExecutionManagerOpen}
        onClose={() => setIsExecutionManagerOpen(false)}
      />
      <ScenarioManagerModal
        isOpen={isScenarioManagerOpen}
        onClose={() => setIsScenarioManagerOpen(false)}
      />
      <ModelUpgradeModal
        isOpen={isModelUpgradeOpen}
        onClose={() => setIsModelUpgradeOpen(false)}
      />
      <JsonViewModal
        isOpen={isJsonViewOpen}
        onClose={() => setIsJsonViewOpen(false)}
      />
    </div>
  );
}
