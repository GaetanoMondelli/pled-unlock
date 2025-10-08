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
import type { TemplateDocument } from "@/lib/firestore-service";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Download,
  Star,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [createFromDefault, setCreateFromDefault] = useState(true);
  const [viewingTemplate, setViewingTemplate] = useState<TemplateDocument | null>(null);

  // Store hooks
  const loadTemplates = useSimulationStore(state => state.loadTemplates);
  const loadTemplate = useSimulationStore(state => state.loadTemplate);
  const createNewTemplate = useSimulationStore(state => state.createNewTemplate);
  const saveCurrentAsTemplate = useSimulationStore(state => state.saveCurrentAsTemplate);
  const deleteTemplate = useSimulationStore(state => state.deleteTemplate);
  const availableTemplates = useSimulationStore(state => state.availableTemplates);
  const currentTemplate = useSimulationStore(state => state.currentTemplate);
  const scenario = useSimulationStore(state => state.scenario);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        variant: "destructive",
        title: "Template name required",
        description: "Please enter a name for the new template.",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (createFromDefault) {
        await createNewTemplate(newTemplateName.trim(), newTemplateDescription.trim() || undefined);
      } else {
        if (!scenario) {
          throw new Error("No scenario loaded to save as template");
        }
        await saveCurrentAsTemplate(newTemplateName.trim(), newTemplateDescription.trim() || undefined);
      }

      toast({
        title: "Template created successfully",
        description: `Template "${newTemplateName}" has been created.`,
      });

      // Reset form
      setNewTemplateName("");
      setNewTemplateDescription("");
      setIsCreating(false);

      // Reload templates to show the new one
      await loadTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        variant: "destructive",
        title: "Failed to create template",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  };

  const handleLoadTemplate = async (templateId: string) => {
    setIsLoading(true);
    try {
      await loadTemplate(templateId);
      toast({
        title: "Template loaded successfully",
        description: "The template has been loaded into the editor.",
      });
      onClose();
    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        variant: "destructive",
        title: "Failed to load template",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!window.confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteTemplate(templateId);
      toast({
        title: "Template deleted",
        description: `Template "${templateName}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete template",
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

  const handleClose = () => {
    // Only allow closing if there are templates available
    if (availableTemplates.length > 0) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Template Manager
          </DialogTitle>
          <DialogDescription>
            {availableTemplates.length === 0
              ? "You need to create at least one template to start working. Templates store your node configurations and allow you to save and reuse your work."
              : "Create, manage, and load simulation templates. Templates store node configurations and can be reused across different executions."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isCreating ? (
            // Create Template Form
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create New Template</h3>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Enter template name..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="template-description">Description (optional)</Label>
                  <Textarea
                    id="template-description"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Enter template description..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Source</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={createFromDefault}
                        onChange={() => setCreateFromDefault(true)}
                        className="text-primary"
                      />
                      <span>Create from default template</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={!createFromDefault}
                        onChange={() => setCreateFromDefault(false)}
                        className="text-primary"
                        disabled={!scenario}
                      />
                      <span>Save current scenario as template</span>
                      {!scenario && (
                        <Badge variant="secondary" className="text-xs">
                          No scenario loaded
                        </Badge>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleCreateTemplate}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Template List
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Available Templates ({availableTemplates.length})</h3>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {availableTemplates.length === 0 && !isCreating ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">No templates found</p>
                    <p className="text-sm text-gray-500 mb-4">
                      You must create at least one template to start working.
                    </p>
                    <Button onClick={() => setIsCreating(true)} size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Template
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {/* Header */}
                    <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">Name</div>
                        <div className="col-span-3">Created</div>
                        <div className="col-span-1">Version</div>
                        <div className="col-span-3 text-center">Actions</div>
                      </div>
                    </div>

                    {/* Template rows */}
                    {availableTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`px-4 py-2 hover:bg-gray-50 transition-colors ${
                          currentTemplate?.id === template.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-2 items-center text-sm">
                          {/* Name column */}
                          <div className="col-span-5 flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {template.name}
                                </span>
                                {currentTemplate?.id === template.id && (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" title="Currently loaded" />
                                )}
                              </div>
                              {template.description && (
                                <div className="text-xs text-gray-500 truncate" title={template.description}>
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Created column */}
                          <div className="col-span-3 text-xs text-gray-500">
                            {new Date(template.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>

                          {/* Version column */}
                          <div className="col-span-1 text-xs text-gray-500 font-mono">
                            v{template.version}
                          </div>

                          {/* Actions column */}
                          <div className="col-span-3 flex items-center justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadTemplate(template.id)}
                              disabled={isLoading || currentTemplate?.id === template.id}
                              className="h-7 px-2 text-xs"
                              title={currentTemplate?.id === template.id ? "Currently loaded" : "Load template"}
                            >
                              {isLoading && currentTemplate?.id !== template.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : currentTemplate?.id === template.id ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingTemplate(template)}
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View JSON"
                            >
                              <Code className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              disabled={isLoading}
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete template"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* JSON Viewer Modal */}
      {viewingTemplate && (
        <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Code className="h-5 w-5 mr-2" />
                Template JSON: {viewingTemplate.name}
              </DialogTitle>
              <DialogDescription>
                Raw JSON representation of the template. You can copy this to backup or share the template.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-96 w-full">
                <pre className="text-xs font-mono bg-gray-50 p-4 rounded border whitespace-pre-wrap">
                  {JSON.stringify(viewingTemplate, null, 2)}
                </pre>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(viewingTemplate, null, 2));
                  toast({
                    title: "Copied to clipboard",
                    description: "Template JSON has been copied to your clipboard.",
                  });
                }}
              >
                Copy JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(viewingTemplate, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${viewingTemplate.name.replace(/[^\w-]/g, '_')}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast({
                    title: "Downloaded",
                    description: "Template JSON has been downloaded.",
                  });
                }}
              >
                Download JSON
              </Button>
              <Button onClick={() => setViewingTemplate(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default TemplateManagerModal;