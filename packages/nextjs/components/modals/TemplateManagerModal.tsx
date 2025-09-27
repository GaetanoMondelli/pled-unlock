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
  Loader2
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Template Manager
          </DialogTitle>
          <DialogDescription>
            Create, manage, and load simulation templates. Templates store node configurations and can be reused across different executions.
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
                <div className="p-4 space-y-3">
                  {availableTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">No templates found</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Create your first template to get started.
                      </p>
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Template
                      </Button>
                    </div>
                  ) : (
                    availableTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                          currentTemplate?.id === template.id ? "border-primary bg-primary/5" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{template.name}</h4>
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                              {currentTemplate?.id === template.id && (
                                <Badge className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Current
                                </Badge>
                              )}
                            </div>

                            {template.description && (
                              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            )}

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Created {formatDate(template.createdAt)}
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                v{template.version}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadTemplate(template.id)}
                              disabled={isLoading || currentTemplate?.id === template.id}
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
                            {!template.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id, template.name)}
                                disabled={isLoading}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
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

export default TemplateManagerModal;