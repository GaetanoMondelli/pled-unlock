"use client";

import { useEffect, useState } from "react";
import { fetchFromDb, updateDb } from "../../utils/api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { D3Graph } from "../ui/d3-graph";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Settings,
  Zap,
} from "lucide-react";

interface CreateProcedureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

interface FSMNode {
  id: string;
  isActive?: boolean;
  isInitial?: boolean;
  isFinal?: boolean;
  metadata?: {
    actions?: string[];
    description?: string;
  };
}

interface FSMTransition {
  source: string;
  target: string;
  label: string;
}

interface NestedVariables {
  [key: string]: {
    [key: string]: {
      type: string;
      required?: boolean;
      default?: string;
      description?: string;
    };
  };
}

// Add this helper function at the top of the component
const countRules = (template: any) => {
  if (!template.messageRules) return 0;
  return Array.isArray(template.messageRules)
    ? template.messageRules.length
    : Object.keys(template.messageRules).length;
};

// Add this helper function at the top of the component
const formatRuleValue = (value: any): string => {
  if (typeof value === "object" && value !== null) {
    if (value.type && value.template) {
      return `${value.type} (${Object.keys(value.template).length} fields)`;
    }
    return JSON.stringify(value);
  }
  return String(value || "");
};

// Add this helper function
const formatActionValue = (action: any): string => {
  if (typeof action === "object" && action !== null) {
    return JSON.stringify(action);
  }
  return String(action || "");
};

// Add this type for better type safety
interface ProcedureInstance {
  instanceId: string;
  templateId: string;
  variables: Record<string, any>;
  history: {
    events: any[];
    messages: any[];
  };
  currentState: string;
}

export const CreateProcedureModal = ({ open, onClose, onSave }: CreateProcedureModalProps) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState("template");

  // Add validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState(1);

  const steps = [
    { number: 1, title: "Select Template" },
    { number: 2, title: "Configure Variables" },
    { number: 3, title: "Rules & Actions" },
    { number: 4, title: "Review" },
  ];

  const nextStep = () => {
    // Validate variables before proceeding from step 2
    if (step === 2) {
      const validationErrors = validateVariables();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      const data = await fetchFromDb();
      setTemplates(data.procedureTemplates || []);
    };
    if (open) {
      loadTemplates();
    }
  }, [open]);

  // Update variables when template changes
  useEffect(() => {
    if (selectedTemplate?.variables) {
      // Initialize nested structure
      const defaultVars: Record<string, any> = {};
      Object.entries(selectedTemplate.variables).forEach(([groupKey, groupConfig]: [string, any]) => {
        defaultVars[groupKey] = {};
        Object.entries(groupConfig).forEach(([fieldKey, fieldConfig]: [string, any]) => {
          defaultVars[groupKey][fieldKey] = fieldConfig.default || "";
        });
      });
      setVariables(defaultVars);
    }
  }, [selectedTemplate]);

  // Convert FSM definition to nodes and links
  const getFSMNodesAndLinks = (fsl: string): { nodes: FSMNode[]; links: FSMTransition[] } => {
    const nodes = new Set<string>();
    const links: FSMTransition[] = [];

    fsl.split(";").forEach(line => {
      line = line.trim();
      if (!line) return;

      const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
      if (match) {
        const [, source, label, target] = match;
        nodes.add(source);
        nodes.add(target);
        links.push({ source, target, label });
      }
    });

    return {
      nodes: Array.from(nodes).map(id => ({
        id,
        isInitial: id === "idle",
        isFinal: !links.some(l => l.source === id),
        metadata: {
          actions: [],
          description: "",
        },
      })),
      links,
    };
  };

  // Validate nested variables
  const validateVariables = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedTemplate?.variables) return newErrors;

    Object.entries(selectedTemplate.variables).forEach(([groupKey, groupConfig]: [string, any]) => {
      Object.entries(groupConfig).forEach(([fieldKey, fieldConfig]: [string, any]) => {
        if (fieldConfig.required && !variables[groupKey]?.[fieldKey]) {
          newErrors[`${groupKey}.${fieldKey}`] = `${groupKey} ${fieldKey} is required`;
        }
      });
    });

    return newErrors;
  };

  // Handle nested variable changes
  const handleVariableChange = (groupKey: string, fieldKey: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [fieldKey]: value,
      },
    }));

    // Clear error if exists
    if (errors[`${groupKey}.${fieldKey}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${groupKey}.${fieldKey}`];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const validationErrors = validateVariables();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Fetch current DB state
      const db = await fetchFromDb();

      // Create new procedure instance
      const newInstance = {
        instanceId: `proc_${Date.now()}`,
        templateId: selectedTemplate.templateId,
        variables: variables,
        currentState: {
          name: "idle",
          enteredAt: new Date().toISOString(),
        },
        history: {
          events: [],
          messages: [],
          completedActions: [],
        },
        startDate: new Date().toISOString(),
      };

      // Add to procedure instances
      const updatedDb = {
        ...db,
        procedureInstances: [...(db.procedureInstances || []), newInstance],
      };

      // Update DB
      await updateDb(updatedDb);

      // Call the onSave callback with the created procedure
      await onSave(newInstance);

      // Close the modal
      onClose();
    } catch (error: any) {
      console.error("Error creating procedure:", error);
      setErrors({
        submit: error.message || "Failed to create procedure. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Procedure</DialogTitle>
          {/* Steps indicator */}
          <div className="flex justify-center items-center gap-4 mt-4">
            {steps.map(s => (
              <div key={s.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full 
                  ${
                    step === s.number
                      ? "bg-primary text-primary-foreground"
                      : step > s.number
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.number}
                </div>
                <span
                  className={`ml-2 text-sm ${step === s.number ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {s.title}
                </span>
                {s.number < 4 && <ChevronRight className="w-4 h-4 mx-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 mt-6">
          <ScrollArea className="h-[600px] pr-4">
            {/* Step 1: Template Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Templates List */}
                  <div>
                    <h3 className="font-medium mb-4">Available Templates</h3>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {templates.map(template => (
                          <div
                            key={template.templateId}
                            className={`group cursor-pointer p-4 rounded-lg border transition-colors
                              ${
                                selectedTemplate?.templateId === template.templateId
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border hover:bg-muted"
                              }`}
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-lg">{template.name || "Unnamed Template"}</h4>
                              <span className="text-xs bg-primary/10 px-2 py-1 rounded">{template.templateId}</span>
                            </div>
                            <p className="text-sm text-muted-foreground group-hover:text-foreground line-clamp-2">
                              {template.description || "No description available"}
                            </p>
                            <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-1 rounded-full bg-muted">
                                {Object.keys(template.variables || {}).length} Variables
                              </span>
                              <span className="px-2 py-1 rounded-full bg-muted">{countRules(template)} Rules</span>
                              <span className="px-2 py-1 rounded-full bg-muted">
                                {Object.keys(template.actions || {}).length} Actions
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Graph Preview */}
                  {selectedTemplate && (
                    <div>
                      <h3 className="font-medium mb-4">State Machine</h3>
                      <div className="bg-slate-50 rounded-lg p-4 h-[300px]">
                        <D3Graph
                          nodes={getFSMNodesAndLinks(selectedTemplate.stateMachine.fsl).nodes}
                          links={getFSMNodesAndLinks(selectedTemplate.stateMachine.fsl).links}
                          width={400}
                          height={280}
                          direction="LR"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Variables Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                {selectedTemplate?.variables &&
                  Object.entries(selectedTemplate.variables).map(([groupKey, groupConfig]: [string, any]) => (
                    <div key={groupKey} className="space-y-4 p-4 border rounded-lg">
                      <h3 className="font-medium capitalize">{groupKey}</h3>
                      <div className="space-y-4">
                        {Object.entries(groupConfig).map(([fieldKey, fieldConfig]: [string, any]) => (
                          <div key={`${groupKey}.${fieldKey}`} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              {fieldKey}
                              {fieldConfig.required && <span className="text-red-500 text-sm">* Required</span>}
                            </Label>
                            <Input
                              value={variables[groupKey]?.[fieldKey] || ""}
                              onChange={e => handleVariableChange(groupKey, fieldKey, e.target.value)}
                              placeholder={fieldConfig.placeholder || `Enter ${fieldKey}`}
                              className={errors[`${groupKey}.${fieldKey}`] ? "border-red-500" : ""}
                            />
                            {fieldConfig.description && (
                              <p className="text-xs text-muted-foreground">{fieldConfig.description}</p>
                            )}
                            {errors[`${groupKey}.${fieldKey}`] && (
                              <p className="text-xs text-red-500">{errors[`${groupKey}.${fieldKey}`]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Step 3: Rules & Actions */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Message Rules Table */}
                <div>
                  <h3 className="font-medium mb-4">Message Rules</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Rule</th>
                          <th className="text-left p-2 font-medium">Matches</th>
                          <th className="text-left p-2 font-medium">Generates</th>
                          <th className="text-left p-2 font-medium w-20">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedTemplate.messageRules?.map((rule: any, index: number) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="p-2 align-top">
                              <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-blue-500" />
                                <span className="font-mono text-xs">{rule.id || `Rule ${index + 1}`}</span>
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2 text-blue-600">
                                  <MessageSquare className="h-3 w-3" />
                                  <span className="font-mono">{formatRuleValue(rule.matches?.type)}</span>
                                </div>
                                {rule.matches?.conditions && (
                                  <div className="text-muted-foreground pl-5">
                                    {Object.entries(rule.matches.conditions).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-1">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span>{key}:</span>
                                        <span className="font-mono bg-slate-100 px-1 rounded">
                                          {formatRuleValue(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span className="font-mono">{formatRuleValue(rule.generates?.type)}</span>
                                </div>
                                {rule.generates?.template && (
                                  <div className="text-muted-foreground pl-5">
                                    {Object.entries(rule.generates.template).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-1">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span>{key}:</span>
                                        <span className="font-mono bg-slate-100 px-1 rounded">
                                          {formatRuleValue(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                                {rule.priority || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions Table */}
                <div>
                  <h3 className="font-medium mb-4">Actions by State</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">State</th>
                          <th className="text-left p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(selectedTemplate.actions || {}).map(([state, actions]) => (
                          <tr key={state} className="hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span className="font-mono text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded">
                                  {state}
                                </span>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="space-y-2">
                                {Array.isArray(actions)
                                  ? actions.map((action, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-xs">
                                        <Settings className="h-3 w-3 text-blue-500" />
                                        <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-sm">
                                          {formatActionValue(action)}
                                        </span>
                                      </div>
                                    ))
                                  : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Selected Template</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium">{selectedTemplate?.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTemplate?.description}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Configured Variables</h3>
                  <div className="space-y-4">
                    {Object.entries(variables).map(([group, fields]: [string, any]) => (
                      <div key={group} className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium capitalize mb-2">{group}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(fields).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="ml-2 font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Navigation Buttons - Always visible */}
        <div className="flex justify-between gap-2 mt-4 pt-4 border-t">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button onClick={nextStep} disabled={step === 1 && !selectedTemplate}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={Object.keys(errors).length > 0 || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Procedure"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
