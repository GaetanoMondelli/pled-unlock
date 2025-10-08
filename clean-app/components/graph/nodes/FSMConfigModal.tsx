"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Code,
  Save,
  Sparkles,
  ArrowRight
} from "lucide-react";
import type { FSMProcessNode } from "@/lib/simulation/types";
import { useSimulationStore } from "@/stores/simulationStore";

interface FSMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  currentConfig: FSMProcessNode;
}

const FSMConfigModal: React.FC<FSMConfigModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  currentConfig
}) => {
  const updateNodeConfigInStore = useSimulationStore(state => state.updateNodeConfigInStore);

  // FSL editor state
  const [fslCode, setFslCode] = useState(currentConfig.fsl || "");

  // JSON editor state
  const [jsonConfig, setJsonConfig] = useState("");
  const [jsonError, setJsonError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFslCode(currentConfig.fsl || "");
      setJsonConfig(JSON.stringify(currentConfig, null, 2));
      setJsonError("");
    }
  }, [isOpen, currentConfig]);

  const updateFromJSON = () => {
    try {
      const parsed = JSON.parse(jsonConfig);

      // Validate basic structure
      if (!parsed.fsm) {
        throw new Error("Config must have 'fsm' object");
      }

      setFslCode(parsed.fsl || "");
      setJsonError("");
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const syncToJSON = () => {
    const config = {
      ...currentConfig,
      fsl: fslCode
    };
    setJsonConfig(JSON.stringify(config, null, 2));
  };

  const handleSave = () => {
    const updatedConfig = {
      ...currentConfig,
      fsl: fslCode
    };

    const success = updateNodeConfigInStore(nodeId, updatedConfig);
    if (success) {
      console.log("FSM configuration saved successfully");
      onClose();
    } else {
      console.error("Failed to save FSM configuration");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Configure FSM: {currentConfig.displayName}
          </DialogTitle>
          <DialogDescription>
            Configure the Finite State Machine using FSL or direct JSON editing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="fsl" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fsl" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                FSL Editor
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                JSON Editor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fsl" className="flex-1 overflow-hidden">
              <div className="space-y-4 h-full flex flex-col">
                <div>
                  <Label className="text-sm font-medium">FSL Definition</Label>
                  <p className="text-xs text-slate-600 mt-1">
                    Define states and transitions using Finite State Language (FSL)
                  </p>
                </div>

                <Textarea
                  value={fslCode}
                  onChange={(e) => setFslCode(e.target.value)}
                  placeholder={`Example FSL:

state idle {
  on token_received -> processing
}

state processing {
  on processing_complete -> complete
  on processing_failed -> idle
}

state complete {
  on reset -> idle
}`}
                  className="font-mono text-sm flex-1 min-h-96"
                />

                <div className="p-3 bg-slate-50 rounded text-xs text-slate-600">
                  <strong>FSL Syntax:</strong><br/>
                  • <code>state name {"{ ... }"}</code> - Define a state<br/>
                  • <code>on trigger -&gt; target</code> - Define transition<br/>
                  • <code>on condition -&gt; target</code> - Conditional transition
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json" className="flex-1 overflow-hidden">
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">JSON Configuration</Label>
                  <div className="space-x-2">
                    <Button onClick={syncToJSON} variant="outline" size="sm">
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Sync from FSL
                    </Button>
                    <Button onClick={updateFromJSON} variant="outline" size="sm">
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Apply JSON
                    </Button>
                  </div>
                </div>

                {jsonError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {jsonError}
                  </div>
                )}

                <Textarea
                  value={jsonConfig}
                  onChange={(e) => setJsonConfig(e.target.value)}
                  placeholder="Enter JSON configuration here..."
                  className="font-mono text-sm flex-1 min-h-96"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FSMConfigModal;