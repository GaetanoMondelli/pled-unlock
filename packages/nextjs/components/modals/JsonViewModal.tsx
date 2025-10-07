"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSimulationStore } from "@/stores/simulationStore";
import { useEventSourcing } from "@/stores/eventSourcingStore";
import {
  Code,
  Copy,
  Download,
  Activity,
  Database,
  Zap,
  FileText,
  Edit
} from "lucide-react";

interface JsonViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JsonViewModal({ isOpen, onClose }: JsonViewModalProps) {
  const { toast } = useToast();
  const simulationStore = useSimulationStore();
  const { currentScenario, availableScenarios } = useEventSourcing();

  // Get current template data to show RAW template scenario
  const currentTemplate = useSimulationStore(state => state.currentTemplate);
  const updateCurrentTemplate = useSimulationStore(state => state.updateCurrentTemplate);
  const loadScenario = useSimulationStore(state => state.loadScenario);

  // State for editing template scenario
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editedTemplateScenario, setEditedTemplateScenario] = useState("");

  // Extract current state data
  const currentData = {
    scenario: simulationStore.scenario,
    currentTime: simulationStore.currentTime,
    nodeStates: simulationStore.nodeStates,
    globalActivityLog: simulationStore.globalActivityLog,
    eventCounter: simulationStore.eventCounter
  };

  // Extract external events (your "source generated" events)
  const externalEvents = currentScenario?.coreEvents || [];

  // Extract execution events (what the model calculated)
  const executionEvents = simulationStore.globalActivityLog;

  // RAW template scenario data - this is what we actually loaded
  const rawTemplateScenario = currentTemplate?.scenario || null;

  // Initialize editing when template changes
  useEffect(() => {
    if (rawTemplateScenario && !isEditingTemplate) {
      setEditedTemplateScenario(JSON.stringify(rawTemplateScenario, null, 2));
    }
  }, [rawTemplateScenario, isEditingTemplate]);

  const handleEditTemplate = () => {
    setIsEditingTemplate(true);
    setEditedTemplateScenario(JSON.stringify(rawTemplateScenario, null, 2));
  };

  const handleSaveTemplate = async () => {
    try {
      // Parse the edited JSON
      const parsedScenario = JSON.parse(editedTemplateScenario);

      // Test load the scenario to see if it validates
      await loadScenario(parsedScenario);

      // If validation passes, save to template (this will also update Firebase Storage)
      await updateCurrentTemplate();

      setIsEditingTemplate(false);
      toast({
        title: "Template Saved",
        description: "Template scenario has been updated and saved to Firebase Storage",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Invalid JSON or scenario format: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTemplate(false);
    setEditedTemplateScenario(JSON.stringify(rawTemplateScenario, null, 2));
  };

  const copyToClipboard = (data: any) => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: "Copied to clipboard",
      description: "JSON data has been copied to your clipboard."
    });
  };

  const downloadJson = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            JSON Data View
          </DialogTitle>
          <DialogDescription>
            View and export the current simulation data. External events are inputs/model changes.
            Execution events are what the model calculated from those inputs.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="template" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template Scenario
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              External Events
            </TabsTrigger>
            <TabsTrigger value="execution" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Execution Events
            </TabsTrigger>
            <TabsTrigger value="state" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Current State
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              All Scenarios
            </TabsTrigger>
          </TabsList>

          {/* Template Scenario Tab - RAW template data */}
          <TabsContent value="template" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Template Scenario (RAW)</h3>
                <p className="text-sm text-gray-600">
                  Raw scenario data from the loaded template - this is what we actually loaded from Firebase Storage
                </p>
                {currentTemplate && (
                  <p className="text-sm text-blue-600 mt-1">
                    Template: "{currentTemplate.name}" (ID: {currentTemplate.id})
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {isEditingTemplate ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveTemplate}
                    >
                      Save to Firebase
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditTemplate}
                      disabled={!currentTemplate}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(rawTemplateScenario)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadJson(rawTemplateScenario, 'template-scenario')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditingTemplate ? (
              <div className="flex-1 flex flex-col min-h-0">
                <Textarea
                  value={editedTemplateScenario}
                  onChange={(e) => setEditedTemplateScenario(e.target.value)}
                  className="flex-1 min-h-[500px] font-mono text-sm resize-none"
                  placeholder="Edit template scenario JSON here..."
                />
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-[500px] max-h-[500px] border rounded-lg">
                <div className="p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {rawTemplateScenario ? JSON.stringify(rawTemplateScenario, null, 2) : 'No template loaded'}
                  </pre>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* External Events Tab */}
          <TabsContent value="external" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">External Events</h3>
                <p className="text-sm text-gray-600">
                  User inputs, timer ticks, model upgrades - the "source generated" events
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(externalEvents)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadJson(externalEvents, 'external-events')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[500px] max-h-[500px] border rounded-lg">
              <div className="p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(externalEvents, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Execution Events Tab */}
          <TabsContent value="execution" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Execution Events</h3>
                <p className="text-sm text-gray-600">
                  What the model calculated from the external events - these depend on the current model
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(executionEvents)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadJson(executionEvents, 'execution-events')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[500px] max-h-[500px] border rounded-lg">
              <div className="p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(executionEvents, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Current State Tab */}
          <TabsContent value="state" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Current Simulation State</h3>
                <p className="text-sm text-gray-600">
                  Complete current state including scenario, node states, and activity logs
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(currentData)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadJson(currentData, 'simulation-state')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[500px] max-h-[500px] border rounded-lg">
              <div className="p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(currentData, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* All Scenarios Tab */}
          <TabsContent value="scenarios" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">All Scenarios</h3>
                <p className="text-sm text-gray-600">
                  All recorded scenarios with their external events and snapshots
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(availableScenarios)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadJson(availableScenarios, 'all-scenarios')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[500px] max-h-[500px] border rounded-lg">
              <div className="p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(availableScenarios, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}