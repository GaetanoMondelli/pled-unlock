"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Save,
  Plus,
  Trash2,
  Settings,
  Play,
  Download,
  Upload,
  GitBranch,
  Database,
  Zap,
  Shield,
  Filter,
  FileText,
  Timer,
  Bell,
  ExternalLink,
  ArrowUpDown,
  Eye,
  Code,
  FileUp,
  Wand2,
  Hash
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";

// Generic Component Categories (as you specified)
const COMPONENT_CATEGORIES = {
  "data-processing": {
    name: "Data Processing",
    icon: Zap,
    color: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Process, transform, and manipulate data",
    defaultStates: ["idle", "processing", "completed", "error"],
    fslPattern: "idle 'data_received' -> processing; processing 'process_complete' -> completed; processing 'error' -> error; error 'retry' -> idle; completed 'reset' -> idle;"
  },
  "aggregation": {
    name: "Aggregation", 
    icon: Database,
    color: "bg-green-100 text-green-800 border-green-300",
    description: "Collect and batch data based on timing or count triggers",
    defaultStates: ["idle", "collecting", "batch_ready", "dispatched"],
    fslPattern: "idle 'start_collection' -> collecting; collecting 'data_received' -> collecting; collecting 'batch_trigger' -> batch_ready; batch_ready 'dispatch' -> dispatched; dispatched 'reset' -> idle;",
    triggerTypes: ["count", "time", "size", "condition"]
  },
  "splitting": {
    name: "Splitting",
    icon: Filter,
    color: "bg-purple-100 text-purple-800 border-purple-300", 
    description: "Route and filter data based on conditions",
    defaultStates: ["idle", "evaluating", "route_a", "route_b", "route_c"],
    fslPattern: "idle 'data_received' -> evaluating; evaluating 'condition_a' -> route_a; evaluating 'condition_b' -> route_b; evaluating 'condition_c' -> route_c; route_a 'reset' -> idle; route_b 'reset' -> idle; route_c 'reset' -> idle;"
  },
  "transformation": {
    name: "Transformation",
    icon: ArrowUpDown,
    color: "bg-orange-100 text-orange-800 border-orange-300",
    description: "Convert data format or structure",
    defaultStates: ["idle", "transforming", "transformed", "error"],
    fslPattern: "idle 'transform_request' -> transforming; transforming 'transform_success' -> transformed; transforming 'transform_error' -> error; transformed 'reset' -> idle; error 'retry' -> idle;"
  },
  "validation": {
    name: "Validation",
    icon: Shield,
    color: "bg-red-100 text-red-800 border-red-300",
    description: "Verify data integrity and authenticity",
    defaultStates: ["idle", "validating", "valid", "invalid"],
    fslPattern: "idle 'validate_request' -> validating; validating 'validation_pass' -> valid; validating 'validation_fail' -> invalid; valid 'reset' -> idle; invalid 'retry' -> idle;"
  },
  "external-integration": {
    name: "External Integration", 
    icon: ExternalLink,
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    description: "Connect to external APIs and services",
    defaultStates: ["idle", "connecting", "connected", "calling", "response_received", "error"],
    fslPattern: "idle 'connect_request' -> connecting; connecting 'connected' -> connected; connected 'api_call' -> calling; calling 'response' -> response_received; calling 'error' -> error; response_received 'reset' -> idle; error 'retry' -> connecting;"
  },
  "storage": {
    name: "Storage",
    icon: FileText,
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Persist and retrieve data",
    defaultStates: ["idle", "storing", "stored", "retrieving", "retrieved", "error"],
    fslPattern: "idle 'store_request' -> storing; storing 'store_success' -> stored; storing 'store_error' -> error; idle 'retrieve_request' -> retrieving; retrieving 'retrieve_success' -> retrieved; retrieving 'retrieve_error' -> error; stored 'reset' -> idle; retrieved 'reset' -> idle; error 'retry' -> idle;"
  },
  "notification": {
    name: "Notification",
    icon: Bell,
    color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
    description: "Send alerts and notifications",
    defaultStates: ["idle", "preparing", "sending", "sent", "failed"],
    fslPattern: "idle 'notification_trigger' -> preparing; preparing 'send' -> sending; sending 'sent_success' -> sent; sending 'sent_failure' -> failed; sent 'reset' -> idle; failed 'retry' -> preparing;"
  }
};

interface WorkflowComponent {
  id: string;
  category: keyof typeof COMPONENT_CATEGORIES;
  name: string;
  position: { x: number; y: number };
  states: string[];
  fslFragment: string;
  config: {
    triggerType?: "count" | "time" | "size" | "condition";
    triggerValue?: number | string;
    conditions?: string[];
    externalEndpoint?: string;
    storageLocation?: string;
    [key: string]: any;
  };
}

interface MessageRule {
  id: string;
  priority: number;
  matches: {
    type: string;
    conditions: Record<string, any>;
  };
  captures: Record<string, string>;
  generates: {
    type: string;
    template: {
      title: string;
      content: string;
      [key: string]: any;
    };
  };
  transition: {
    to: string;
    conditions?: Record<string, any>;
  };
}

interface StateDefinition {
  description: string;
  actions: string[];
}

interface ActionDefinition {
  id: string;
  name: string;
  type: string;
  description: string;
  template: Record<string, any>;
}

export default function TemplateEditorPage() {
  // Template Metadata
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  
  // Variables
  const [templateVariables, setTemplateVariables] = useState<Record<string, any>>({});
  
  // Event Types
  const [eventTypes, setEventTypes] = useState<Array<{type: string, schema: Record<string, string>}>>([]);
  
  // Message Rules
  const [messageRules, setMessageRules] = useState<MessageRule[]>([]);
  
  // Workflow Components (FSL Composition)
  const [workflowComponents, setWorkflowComponents] = useState<WorkflowComponent[]>([]);
  
  // States
  const [stateDefinitions, setStateDefinitions] = useState<Record<string, StateDefinition>>({});
  
  // Actions
  const [actionDefinitions, setActionDefinitions] = useState<Record<string, ActionDefinition>>({});
  
  // Documents/Contracts
  const [documents, setDocuments] = useState<Array<{id: string, name: string, type: string, content: string}>>([]);
  
  // UI State
  const [selectedComponent, setSelectedComponent] = useState<WorkflowComponent | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<keyof typeof COMPONENT_CATEGORIES | null>(null);
  const [showFSLPreview, setShowFSLPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedContract, setUploadedContract] = useState<File | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate complete FSL from workflow components
  const generateCompleteFSL = useCallback(() => {
    if (workflowComponents.length === 0) return "";

    let fsl = "";
    
    workflowComponents.forEach((component, index) => {
      if (index > 0) fsl += " ";
      fsl += `/* ${component.name} (${COMPONENT_CATEGORIES[component.category].name}) */ `;
      fsl += component.fslFragment;
      if (!component.fslFragment.endsWith(";")) fsl += ";";
    });

    return fsl;
  }, [workflowComponents]);

  // Handle contract upload and pre-populate template
  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedContract(file);
    
    // Simulate contract analysis and pre-population
    const contractName = file.name.replace(/\.[^/.]+$/, "");
    
    // Pre-populate based on contract type (simulation)
    setTemplateName(`${contractName} Workflow`);
    setTemplateDescription(`Automated workflow for ${contractName} processing`);
    
    if (contractName.toLowerCase().includes('employment')) {
      setTemplateCategory('hr');
      
      // Pre-populate common HR workflow
      const hrComponents: WorkflowComponent[] = [
        {
          id: 'validation_1',
          category: 'validation',
          name: 'Document Validation',
          position: { x: 50, y: 50 },
          states: COMPONENT_CATEGORIES.validation.defaultStates,
          fslFragment: COMPONENT_CATEGORIES.validation.fslPattern,
          config: {}
        },
        {
          id: 'external_1', 
          category: 'external-integration',
          name: 'DocuSign Integration',
          position: { x: 300, y: 50 },
          states: COMPONENT_CATEGORIES['external-integration'].defaultStates,
          fslFragment: COMPONENT_CATEGORIES['external-integration'].fslPattern,
          config: { externalEndpoint: 'https://api.docusign.com' }
        },
        {
          id: 'storage_1',
          category: 'storage', 
          name: 'Document Storage',
          position: { x: 550, y: 50 },
          states: COMPONENT_CATEGORIES.storage.defaultStates,
          fslFragment: COMPONENT_CATEGORIES.storage.fslPattern,
          config: { storageLocation: 'firestore' }
        }
      ];
      
      setWorkflowComponents(hrComponents);
    }
    
    if (contractName.toLowerCase().includes('carbon') || contractName.toLowerCase().includes('renewable')) {
      setTemplateCategory('carbon');
      
      // Pre-populate carbon credit workflow
      const carbonComponents: WorkflowComponent[] = [
        {
          id: 'validation_1',
          category: 'validation',
          name: 'IoT Data Validation', 
          position: { x: 50, y: 50 },
          states: COMPONENT_CATEGORIES.validation.defaultStates,
          fslFragment: COMPONENT_CATEGORIES.validation.fslPattern,
          config: {}
        },
        {
          id: 'aggregation_1',
          category: 'aggregation',
          name: 'Measurement Aggregation',
          position: { x: 300, y: 50 }, 
          states: COMPONENT_CATEGORIES.aggregation.defaultStates,
          fslFragment: COMPONENT_CATEGORIES.aggregation.fslPattern,
          config: { triggerType: 'count', triggerValue: 24 }
        },
        {
          id: 'transformation_1',
          category: 'transformation',
          name: 'Token Creation',
          position: { x: 550, y: 50 },
          states: COMPONENT_CATEGORIES.transformation.defaultStates,
          fslFragment: COMPONENT_CATEGORIES.transformation.fslPattern,
          config: {}
        }
      ];
      
      setWorkflowComponents(carbonComponents);
    }
    
    // Add document to documents array
    setDocuments(prev => [...prev, {
      id: `doc_${Date.now()}`,
      name: file.name,
      type: 'contract',
      content: `Contract file: ${file.name}`
    }]);
  };

  // Handle drag and drop for workflow canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCategory || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const categoryDef = COMPONENT_CATEGORIES[draggedCategory];
    const newComponent: WorkflowComponent = {
      id: `${draggedCategory}_${Date.now()}`,
      category: draggedCategory,
      name: `${categoryDef.name} ${workflowComponents.length + 1}`,
      position: { x, y },
      states: [...categoryDef.defaultStates],
      fslFragment: categoryDef.fslPattern,
      config: {}
    };

    setWorkflowComponents(prev => [...prev, newComponent]);
    setDraggedCategory(null);
  };

  // Save complete template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    setIsSaving(true);
    try {
      const templateData = {
        templateId: `template_${Date.now()}`,
        name: templateName,
        description: templateDescription,
        category: templateCategory || "custom",
        variables: templateVariables,
        eventTypes: eventTypes,
        messageRules: messageRules,
        stateMachine: {
          fsl: generateCompleteFSL(),
          initial: "idle",
          components: workflowComponents.reduce((acc, comp) => {
            acc[comp.id] = {
              states: comp.states,
              purpose: COMPONENT_CATEGORIES[comp.category].description,
              category: COMPONENT_CATEGORIES[comp.category].name,
              config: comp.config
            };
            return acc;
          }, {} as Record<string, any>)
        },
        states: stateDefinitions,
        actions: actionDefinitions,
        documents: {
          contracts: documents
        }
      };

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: [templateData] })
      });

      if (response.ok) {
        alert("Template saved successfully!");
        // Reset form
        setTemplateName("");
        setTemplateDescription("");
        setTemplateCategory("");
        setWorkflowComponents([]);
        setDocuments([]);
        setMessageRules([]);
        setEventTypes([]);
        setStateDefinitions({});
        setActionDefinitions({});
      } else {
        const error = await response.json();
        alert(`Failed to save template: ${error.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <Breadcrumb items={[
          { label: "Templates", href: "/templates" },
          { label: "Template Editor", current: true }
        ]} />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Comprehensive Template Editor</h1>
          <p className="text-muted-foreground">
            Create complete workflow templates with contracts, rules, composable FSL, and actions
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
                <CardDescription>Basic template metadata and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="My Workflow Template"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={templateCategory} onValueChange={setTemplateCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carbon">Carbon Credits</SelectItem>
                        <SelectItem value="contracts">Contracts</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="supply-chain">Supply Chain</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe what this workflow template does..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workflowComponents.length}</div>
                  <div className="text-sm text-muted-foreground">Components configured</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Message Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{messageRules.length}</div>
                  <div className="text-sm text-muted-foreground">Rules defined</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{documents.length}</div>
                  <div className="text-sm text-muted-foreground">Contracts uploaded</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Contract Upload & Analysis
                </CardTitle>
                <CardDescription>
                  Upload contracts to auto-populate template structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="contract-upload" className="cursor-pointer">
                      <Input
                        id="contract-upload"
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleContractUpload}
                        className="hidden"
                      />
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Contract
                      </Button>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, DOCX, DOC, and TXT files
                    </p>
                  </div>
                </div>

                {uploadedContract && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium">{uploadedContract.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(uploadedContract.size / 1024)} KB
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Wand2 className="h-4 w-4 mr-1" />
                          Analyze
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {documents.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Documents</Label>
                    {documents.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{doc.name}</span>
                            <Badge variant="outline">{doc.type}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow Tab - Composable FSL */}
          <TabsContent value="workflow" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Component Categories Palette */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Component Categories
                  </CardTitle>
                  <CardDescription>Drag to canvas to build workflow</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {Object.entries(COMPONENT_CATEGORIES).map(([key, category]) => {
                        const Icon = category.icon;
                        return (
                          <Card
                            key={key}
                            className={`cursor-move transition-all hover:shadow-md ${category.color} border-2`}
                            draggable
                            onDragStart={() => setDraggedCategory(key as keyof typeof COMPONENT_CATEGORIES)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-4 w-4" />
                                <span className="font-medium text-sm">{category.name}</span>
                              </div>
                              <div className="text-xs opacity-75">
                                {category.description}
                              </div>
                              {key === "aggregation" && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-xs">Count</Badge>
                                  <Badge variant="outline" className="text-xs">Time</Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Workflow Canvas */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Workflow Canvas</CardTitle>
                        <CardDescription>Compose your workflow with generic components</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowFSLPreview(true)}>
                        <Code className="h-4 w-4 mr-1" />
                        View FSL
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      ref={canvasRef}
                      className="relative h-[400px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-auto"
                      onDrop={handleCanvasDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {workflowComponents.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Drag component categories here</p>
                          </div>
                        </div>
                      ) : (
                        workflowComponents.map((component) => {
                          const categoryDef = COMPONENT_CATEGORIES[component.category];
                          const Icon = categoryDef.icon;
                          return (
                            <div
                              key={component.id}
                              className={`absolute cursor-pointer transition-all hover:shadow-lg ${
                                selectedComponent?.id === component.id ? 'ring-2 ring-blue-500' : ''
                              }`}
                              style={{ left: component.position.x, top: component.position.y }}
                              onClick={() => setSelectedComponent(component)}
                            >
                              <Card className={`w-56 ${categoryDef.color} border-2`}>
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span className="font-medium text-sm">{component.name}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-red-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkflowComponents(prev => prev.filter(c => c.id !== component.id));
                                        if (selectedComponent?.id === component.id) {
                                          setSelectedComponent(null);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  <div className="text-xs space-y-1">
                                    <div>Category: {categoryDef.name}</div>
                                    {component.config.triggerType && (
                                      <div className="flex items-center gap-1">
                                        {component.config.triggerType === "count" ? (
                                          <Hash className="h-3 w-3" />
                                        ) : (
                                          <Timer className="h-3 w-3" />
                                        )}
                                        <span>
                                          {component.config.triggerType}: {component.config.triggerValue}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                      {component.states.slice(0, 3).map((state) => (
                                        <Badge key={state} variant="outline" className="text-xs py-0">
                                          {state}
                                        </Badge>
                                      ))}
                                      {component.states.length > 3 && (
                                        <Badge variant="outline" className="text-xs py-0">
                                          +{component.states.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Component Properties */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {selectedComponent ? (
                      <div className="space-y-4">
                        <div>
                          <Label>Component Name</Label>
                          <Input
                            value={selectedComponent.name}
                            onChange={(e) => {
                              setWorkflowComponents(prev => prev.map(c => 
                                c.id === selectedComponent.id 
                                  ? { ...c, name: e.target.value }
                                  : c
                              ));
                              setSelectedComponent(prev => prev ? { ...prev, name: e.target.value } : null);
                            }}
                          />
                        </div>

                        <div>
                          <Label>Category</Label>
                          <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                            {COMPONENT_CATEGORIES[selectedComponent.category].name}
                          </div>
                        </div>

                        {selectedComponent.category === "aggregation" && (
                          <>
                            <div>
                              <Label>Trigger Type</Label>
                              <Select
                                value={selectedComponent.config.triggerType || "count"}
                                onValueChange={(value: "count" | "time" | "size" | "condition") => {
                                  const newConfig = { ...selectedComponent.config, triggerType: value };
                                  setWorkflowComponents(prev => prev.map(c => 
                                    c.id === selectedComponent.id 
                                      ? { ...c, config: newConfig }
                                      : c
                                  ));
                                  setSelectedComponent(prev => prev ? { ...prev, config: newConfig } : null);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="count">Count</SelectItem>
                                  <SelectItem value="time">Time</SelectItem>
                                  <SelectItem value="size">Size</SelectItem>
                                  <SelectItem value="condition">Condition</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Trigger Value</Label>
                              <Input
                                type="number"
                                value={selectedComponent.config.triggerValue || ""}
                                onChange={(e) => {
                                  const newConfig = { ...selectedComponent.config, triggerValue: parseInt(e.target.value) };
                                  setWorkflowComponents(prev => prev.map(c => 
                                    c.id === selectedComponent.id 
                                      ? { ...c, config: newConfig }
                                      : c
                                  ));
                                  setSelectedComponent(prev => prev ? { ...prev, config: newConfig } : null);
                                }}
                                placeholder={selectedComponent.config.triggerType === "time" ? "Minutes" : "Count"}
                              />
                            </div>
                          </>
                        )}

                        {selectedComponent.category === "external-integration" && (
                          <div>
                            <Label>External Endpoint</Label>
                            <Input
                              value={selectedComponent.config.externalEndpoint || ""}
                              onChange={(e) => {
                                const newConfig = { ...selectedComponent.config, externalEndpoint: e.target.value };
                                setWorkflowComponents(prev => prev.map(c => 
                                  c.id === selectedComponent.id 
                                    ? { ...c, config: newConfig }
                                    : c
                                ));
                                setSelectedComponent(prev => prev ? { ...prev, config: newConfig } : null);
                              }}
                              placeholder="https://api.example.com"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Select a component to edit</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Rules</CardTitle>
                <CardDescription>Define how events trigger state transitions and generate messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messageRules.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No message rules defined yet</p>
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Rule
                      </Button>
                    </div>
                  ) : (
                    messageRules.map((rule) => (
                      <Card key={rule.id}>
                        <CardContent className="p-4">
                          <div className="font-medium">Rule {rule.id}</div>
                          <div className="text-sm text-muted-foreground">Priority: {rule.priority}</div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Define actions that can be executed in workflow states</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No actions defined yet</p>
                  <Button variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
                <CardDescription>Review your complete template before saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Template Name</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded">{templateName || "Untitled Template"}</div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded">{templateCategory || "No category"}</div>
                  </div>
                </div>

                <div>
                  <Label>Generated FSL</Label>
                  <div className="mt-2">
                    <ScrollArea className="h-32 w-full border rounded p-3 bg-gray-50">
                      <pre className="text-sm font-mono">
                        {generateCompleteFSL() || "// Add workflow components to generate FSL"}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>

                <Separator />
                
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Ready to save: {workflowComponents.length} components, {documents.length} documents
                  </div>
                  <Button 
                    onClick={saveTemplate} 
                    disabled={isSaving || !templateName.trim()}
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* FSL Preview Dialog */}
      <Dialog open={showFSLPreview} onOpenChange={setShowFSLPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generated Composable FSL</DialogTitle>
            <DialogDescription>
              Finite State Language composed from your workflow components
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 w-full">
            <pre className="text-sm bg-gray-100 p-4 rounded-lg font-mono whitespace-pre-wrap">
              {generateCompleteFSL() || "// Add workflow components to generate FSL\n// Each component contributes its FSL fragment with clear boundaries"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}