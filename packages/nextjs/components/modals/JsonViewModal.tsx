"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Zap
} from "lucide-react";

interface JsonViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JsonViewModal({ isOpen, onClose }: JsonViewModalProps) {
  const { toast } = useToast();
  const simulationStore = useSimulationStore();
  const { currentScenario, availableScenarios } = useEventSourcing();

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

        <Tabs defaultValue="external" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
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

            <ScrollArea className="flex-1 border rounded-lg p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(externalEvents, null, 2)}
              </pre>
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

            <ScrollArea className="flex-1 border rounded-lg p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(executionEvents, null, 2)}
              </pre>
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

            <ScrollArea className="flex-1 border rounded-lg p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(currentData, null, 2)}
              </pre>
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

            <ScrollArea className="flex-1 border rounded-lg p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(availableScenarios, null, 2)}
              </pre>
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