"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, GitBranch, Link, Play, Save, Settings, Trash2, Upload, Zap } from "lucide-react";

interface StateMachineComponent {
  id: string;
  name: string;
  type: ComponentType;
  position: { x: number; y: number };
  states: string[];
  inputs: string[];
  outputs: string[];
  config: Record<string, any>;
  fsl: string;
}

interface Connection {
  id: string;
  from: { componentId: string; output: string };
  to: { componentId: string; input: string };
  messageType: string;
}

type ComponentType =
  | "iot-validator"
  | "measurement-queue"
  | "token-creator"
  | "quality-splitter"
  | "aggregator"
  | "certificate-generator";

const COMPONENT_TEMPLATES: Record<ComponentType, Omit<StateMachineComponent, "id" | "position">> = {
  "iot-validator": {
    name: "IoT Validator",
    type: "iot-validator",
    states: ["idle", "validating", "validated", "error"],
    inputs: ["measurements"],
    outputs: ["validated_data", "errors"],
    config: { validationEndpoint: "", deviceType: "hydro-meter" },
    fsl: "idle 'measurement_received' -> validating; validating 'signature_valid' -> validated; validating 'signature_invalid' -> error; error 'retry' -> idle;",
  },
  "measurement-queue": {
    name: "Measurement Queue",
    type: "measurement-queue",
    states: ["idle", "accumulating", "batch_ready"],
    inputs: ["validated_data"],
    outputs: ["batch"],
    config: { batchSize: 24, timeout: "1h" },
    fsl: "idle 'data_received' -> accumulating; accumulating 'data_received' -> accumulating; accumulating 'threshold_reached' -> batch_ready; batch_ready 'batch_processed' -> idle;",
  },
  "token-creator": {
    name: "Token Creator",
    type: "token-creator",
    states: ["idle", "creating", "completed"],
    inputs: ["batch"],
    outputs: ["tokens"],
    config: { conversionRate: 1000, tokenStandard: "VCS" },
    fsl: "idle 'batch_received' -> creating; creating 'tokens_minted' -> completed; completed 'reset' -> idle;",
  },
  "quality-splitter": {
    name: "Quality Splitter",
    type: "quality-splitter",
    states: ["idle", "evaluating", "routing"],
    inputs: ["tokens"],
    outputs: ["high_quality", "low_quality"],
    config: { qualityThreshold: 95 },
    fsl: "idle 'tokens_received' -> evaluating; evaluating 'quality_checked' -> routing; routing 'routed' -> idle;",
  },
  aggregator: {
    name: "Token Aggregator",
    type: "aggregator",
    states: ["idle", "accumulating", "threshold_reached"],
    inputs: ["high_quality"],
    outputs: ["token_pool"],
    config: { certificateSize: 100 },
    fsl: "idle 'token_received' -> accumulating; accumulating 'token_received' -> accumulating; accumulating 'threshold_reached' -> threshold_reached; threshold_reached 'pool_processed' -> idle;",
  },
  "certificate-generator": {
    name: "Certificate Generator",
    type: "certificate-generator",
    states: ["idle", "generating", "completed"],
    inputs: ["token_pool"],
    outputs: ["certificate"],
    config: { standard: "VCS", issuer: "Carbon Registry" },
    fsl: "idle 'pool_received' -> generating; generating 'certificate_created' -> completed; completed 'reset' -> idle;",
  },
};

export default function WorkflowBuilderPage() {
  const [components, setComponents] = useState<StateMachineComponent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<ComponentType | null>(null);
  const [simulationState, setSimulationState] = useState<"idle" | "running" | "paused">("idle");
  const [simulationStep, setSimulationStep] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const addComponent = useCallback((type: ComponentType, position: { x: number; y: number }) => {
    const template = COMPONENT_TEMPLATES[type];
    const newComponent: StateMachineComponent = {
      ...template,
      id: `${type}_${Date.now()}`,
      position,
    };
    setComponents(prev => [...prev, newComponent]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedComponent || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      addComponent(draggedComponent, { x, y });
      setDraggedComponent(null);
    },
    [draggedComponent, addComponent],
  );

  const handleComponentDrag = useCallback(
    (componentId: string, e: React.MouseEvent) => {
      const component = components.find(c => c.id === componentId);
      if (!component) return;

      const startX = e.clientX - component.position.x;
      const startY = e.clientY - component.position.y;

      const handleMouseMove = (e: MouseEvent) => {
        setComponents(prev =>
          prev.map(c =>
            c.id === componentId ? { ...c, position: { x: e.clientX - startX, y: e.clientY - startY } } : c,
          ),
        );
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [components],
  );

  const deleteComponent = useCallback((componentId: string) => {
    setComponents(prev => prev.filter(c => c.id !== componentId));
    setConnections(prev => prev.filter(c => c.from.componentId !== componentId && c.to.componentId !== componentId));
    setSelectedComponent(null);
  }, []);

  const startConnection = useCallback((fromComponentId: string, output: string) => {
    // This would start the connection drawing process
    console.log(`Starting connection from ${fromComponentId}.${output}`);
  }, []);

  const startSimulation = useCallback(() => {
    setSimulationState("running");
    setSimulationStep(0);
    // Simulate step by step through the workflow
  }, []);

  const generateCompiledWorkflow = useCallback(() => {
    // Compile all components into a single FSL state machine
    const compiledFSL = components.map(c => `/* ${c.name} Component */ ${c.fsl}`).join("\n");

    return {
      fsl: compiledFSL,
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        states: c.states,
        config: c.config,
      })),
      connections,
      metadata: {
        createdAt: new Date().toISOString(),
        componentCount: components.length,
        connectionCount: connections.length,
      },
    };
  }, [components, connections]);

  return (
    <div className="container mx-auto p-6">
      <Breadcrumb items={[{ label: "Workflows", current: true }]} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflow Builder</h1>
          <p className="text-muted-foreground">Design composable state machine workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startSimulation}>
            <Play className="h-4 w-4 mr-1" />
            Simulate
          </Button>
          <Button variant="outline">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button onClick={() => console.log(generateCompiledWorkflow())}>
            <Download className="h-4 w-4 mr-1" />
            Export Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Component Palette */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Component Library</CardTitle>
            <CardDescription>Drag components to the canvas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(COMPONENT_TEMPLATES).map(([type, template]) => (
              <div
                key={type}
                draggable
                onDragStart={() => setDraggedComponent(type as ComponentType)}
                className="p-3 border rounded-lg cursor-move hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.states.length} states</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Main Canvas */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Workflow Canvas
                {simulationState === "running" && (
                  <Badge variant="secondary">
                    <Zap className="h-3 w-3 mr-1" />
                    Step {simulationStep}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div
                ref={canvasRef}
                className="relative w-full h-full bg-grid-pattern border-2 border-dashed border-muted-foreground/20 rounded-lg overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Render Components */}
                {components.map(component => (
                  <div
                    key={component.id}
                    className={`absolute p-3 bg-background border rounded-lg shadow-sm cursor-move hover:shadow-md transition-all ${
                      selectedComponent === component.id ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      left: component.position.x,
                      top: component.position.y,
                      width: 200,
                    }}
                    onMouseDown={e => handleComponentDrag(component.id, e)}
                    onClick={() => setSelectedComponent(component.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        <span className="font-medium text-sm">{component.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          deleteComponent(component.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">States: {component.states.join(", ")}</div>

                      {/* Input Ports */}
                      <div className="flex flex-wrap gap-1">
                        {component.inputs.map(input => (
                          <Badge key={input} variant="outline" className="text-xs">
                            ← {input}
                          </Badge>
                        ))}
                      </div>

                      {/* Output Ports */}
                      <div className="flex flex-wrap gap-1">
                        {component.outputs.map(output => (
                          <Badge
                            key={output}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={e => {
                              e.stopPropagation();
                              startConnection(component.id, output);
                            }}
                          >
                            {output} →
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Render Connections */}
                {connections.map(connection => (
                  <svg key={connection.id} className="absolute inset-0 pointer-events-none">
                    <line
                      x1={0}
                      y1={0}
                      x2={100}
                      y2={100}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      markerEnd="url(#arrowhead)"
                    />
                  </svg>
                ))}

                {/* Empty State */}
                {components.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Drag components here</p>
                      <p className="text-sm">Build your workflow by connecting state machine components</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Properties</CardTitle>
            <CardDescription>{selectedComponent ? "Configure component" : "Select a component"}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedComponent ? (
              <ComponentPropertiesPanel
                component={components.find(c => c.id === selectedComponent)!}
                onUpdate={updates => {
                  setComponents(prev => prev.map(c => (c.id === selectedComponent ? { ...c, ...updates } : c)));
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No component selected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Simulation Panel */}
      {simulationState !== "idle" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Live Simulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="steps">
              <TabsList>
                <TabsTrigger value="steps">Simulation Steps</TabsTrigger>
                <TabsTrigger value="messages">Message Flow</TabsTrigger>
                <TabsTrigger value="states">State Changes</TabsTrigger>
              </TabsList>

              <TabsContent value="steps" className="mt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium">Step 1: IoT measurement received</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="font-medium">Step 2: Signature validation (pending)</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messages">
                <div className="text-sm text-muted-foreground">
                  Message flow between components will be shown here during simulation
                </div>
              </TabsContent>

              <TabsContent value="states">
                <div className="text-sm text-muted-foreground">
                  State transitions for each component will be tracked here
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComponentPropertiesPanel({
  component,
  onUpdate,
}: {
  component: StateMachineComponent;
  onUpdate: (updates: Partial<StateMachineComponent>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Component Name</label>
        <Input value={component.name} onChange={e => onUpdate({ name: e.target.value })} className="mt-1" />
      </div>

      <div>
        <label className="text-sm font-medium">FSL Definition</label>
        <textarea
          value={component.fsl}
          onChange={e => onUpdate({ fsl: e.target.value })}
          className="mt-1 w-full p-2 border rounded text-xs font-mono"
          rows={4}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Configuration</label>
        <div className="mt-2 space-y-2">
          {Object.entries(component.config).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-20">{key}:</label>
              <Input
                value={String(value)}
                onChange={e =>
                  onUpdate({
                    config: { ...component.config, [key]: e.target.value },
                  })
                }
                className="flex-1 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">States</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {component.states.map(state => (
            <Badge key={state} variant="outline" className="text-xs">
              {state}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
