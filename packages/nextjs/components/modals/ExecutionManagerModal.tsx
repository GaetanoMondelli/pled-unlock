"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useSimulationStore } from "@/stores/simulationStore";
import { templateService } from "@/lib/template-service";
import type { ExecutionDocument } from "@/lib/firestore-service";
import {
  Play,
  Plus,
  Save,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Archive,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExecutionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExecutionManagerModal: React.FC<ExecutionManagerModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newExecutionName, setNewExecutionName] = useState("");
  const [newExecutionDescription, setNewExecutionDescription] = useState("");
  const [availableExecutions, setAvailableExecutions] = useState<ExecutionDocument[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Store hooks
  const saveExecution = useSimulationStore(state => state.saveExecution);
  const loadExecution = useSimulationStore(state => state.loadExecution);
  const currentTemplate = useSimulationStore(state => state.currentTemplate);
  const currentExecution = useSimulationStore(state => state.currentExecution);
  const scenario = useSimulationStore(state => state.scenario);
  const currentTime = useSimulationStore(state => state.currentTime);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);

  useEffect(() => {
    if (isOpen && currentTemplate) {
      loadExecutions();
    }
  }, [isOpen, currentTemplate?.id]);

  const loadExecutions = async () => {
    if (!currentTemplate) return;

    setIsLoading(true);
    try {
      const executions = await templateService.getExecutions(currentTemplate.id);
      setAvailableExecutions(executions);
    } catch (error) {
      console.error("Error loading executions:", error);
      toast({
        variant: "destructive",
        title: "Failed to load executions",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  };

  const handleSaveExecution = async () => {
    if (!newExecutionName.trim()) {
      toast({
        variant: "destructive",
        title: "Execution name required",
        description: "Please enter a name for the execution.",
      });
      return;
    }

    if (!scenario || !currentTemplate) {
      toast({
        variant: "destructive",
        title: "Cannot save execution",
        description: "No template or scenario loaded.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveExecution(newExecutionName.trim(), newExecutionDescription.trim() || undefined);

      toast({
        title: "Execution saved successfully",
        description: `Execution "${newExecutionName}" has been saved.`,
      });

      // Reset form
      setNewExecutionName("");
      setNewExecutionDescription("");
      setShowSaveForm(false);

      // Reload executions to show the new one
      await loadExecutions();
    } catch (error) {
      console.error("Error saving execution:", error);
      toast({
        variant: "destructive",
        title: "Failed to save execution",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsSaving(false);
  };

  const handleLoadExecution = async (executionId: string) => {
    setIsLoading(true);
    try {
      await loadExecution(executionId);
      toast({
        title: "Execution loaded successfully",
        description: "The execution state has been restored.",
      });
      onClose();
    } catch (error) {
      console.error("Error loading execution:", error);
      toast({
        variant: "destructive",
        title: "Failed to load execution",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExecutionStatus = (execution: ExecutionDocument) => {
    if (execution.isCompleted) {
      return { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    } else if (execution.currentTime > 0 || execution.globalActivityLog.length > 0) {
      return { label: "In Progress", color: "bg-yellow-100 text-yellow-800", icon: Play };
    } else {
      return { label: "Not Started", color: "bg-gray-100 text-gray-800", icon: Archive };
    }
  };

  if (!currentTemplate) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Archive className="h-5 w-5 mr-2" />
              Execution Manager
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No template loaded</p>
            <p className="text-sm text-gray-500">
              Please load a template first to manage executions.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Archive className="h-5 w-5 mr-2" />
            Execution Manager
          </DialogTitle>
          <DialogDescription>
            Save and load execution states for template "{currentTemplate.name}". Executions preserve the complete simulation state including node states, logs, and timing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {showSaveForm ? (
            // Save Execution Form
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Save Current Execution</h3>
                <Button variant="outline" onClick={() => setShowSaveForm(false)}>
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="execution-name">Execution Name</Label>
                  <Input
                    id="execution-name"
                    value={newExecutionName}
                    onChange={(e) => setNewExecutionName(e.target.value)}
                    placeholder="Enter execution name..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="execution-description">Description (optional)</Label>
                  <Textarea
                    id="execution-description"
                    value={newExecutionDescription}
                    onChange={(e) => setNewExecutionDescription(e.target.value)}
                    placeholder="Enter execution description..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Current State Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Simulation Time:</span>
                      <span className="ml-2 font-mono">{currentTime}s</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Events:</span>
                      <span className="ml-2 font-mono">{globalActivityLog.length}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveExecution}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Execution
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Execution List
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">
                  Saved Executions ({availableExecutions.length})
                </h3>
                <Button onClick={() => setShowSaveForm(true)} disabled={!scenario}>
                  <Plus className="mr-2 h-4 w-4" />
                  Save Current
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400 mb-4" />
                      <p className="text-gray-600">Loading executions...</p>
                    </div>
                  ) : availableExecutions.length === 0 ? (
                    <div className="text-center py-8">
                      <Archive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">No saved executions</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Save your current simulation state to preserve progress.
                      </p>
                      <Button onClick={() => setShowSaveForm(true)} disabled={!scenario}>
                        <Plus className="mr-2 h-4 w-4" />
                        Save Current Execution
                      </Button>
                    </div>
                  ) : (
                    availableExecutions.map((execution) => {
                      const status = getExecutionStatus(execution);
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={execution.id}
                          className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                            currentExecution?.id === execution.id ? "border-primary bg-primary/5" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{execution.name}</h4>
                                <Badge className={`text-xs ${status.color}`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                                {currentExecution?.id === execution.id && (
                                  <Badge className="text-xs">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Loaded
                                  </Badge>
                                )}
                              </div>

                              {execution.description && (
                                <p className="text-sm text-gray-600 mb-3">{execution.description}</p>
                              )}

                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="text-sm">
                                  <span className="text-gray-500">Simulation Time:</span>
                                  <span className="ml-2 font-mono">{execution.currentTime}s</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Total Events:</span>
                                  <span className="ml-2 font-mono">{execution.globalActivityLog.length}</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Started {formatDate(execution.startedAt)}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Last saved {formatDate(execution.lastSavedAt)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLoadExecution(execution.id)}
                                disabled={isLoading || currentExecution?.id === execution.id}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" />
                                    Load
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExecutionManagerModal;