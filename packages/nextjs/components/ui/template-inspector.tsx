"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { D3Graph } from "./d3-graph";
import { 
  Settings, 
  Code, 
  Play, 
  GitBranch, 
  Activity, 
  FileText,
  Zap,
  Eye,
  Copy,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface TemplateInspectorProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateInspector({ template, open, onOpenChange }: TemplateInspectorProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!template) return null;

  // Parse FSL to extract nodes and links for visualization
  const getNodesFromFsm = (fsl: string) => {
    const stateSet = new Set<string>();
    
    fsl.split(";").forEach(line => {
      line = line.trim();
      if (line) {
        const sourceState = line.split(/\s+/)[0];
        const targetState = line.split("->")[1]?.trim();
        
        if (sourceState) stateSet.add(sourceState);
        if (targetState) stateSet.add(targetState);
      }
    });

    return Array.from(stateSet).map(state => ({
      id: state,
      isInitial: state === "idle" || state === template.stateMachine?.initial
    }));
  };

  const getLinksFromFsm = (fsl: string) => {
    const links: { source: string; target: string; label: string }[] = [];

    fsl.split(";").forEach(line => {
      line = line.trim();
      if (!line) return;

      const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
      if (match) {
        const [, source, event, target] = match;
        links.push({ source, target, label: event });
      }
    });

    return links;
  };

  const nodes = getNodesFromFsm(template.stateMachine?.fsl || "");
  const links = getLinksFromFsm(template.stateMachine?.fsl || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {template.name}
          </DialogTitle>
          <DialogDescription>
            Template inspection and playground
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="state-machine">State Machine</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Template Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Description:</span>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">Category:</span>
                      <Badge variant="outline" className="ml-2">
                        {template.category || "general"}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Variables:</span>
                      <div className="mt-1 space-y-1">
                        {Object.keys(template.variables || {}).map(varGroup => (
                          <div key={varGroup} className="text-xs">
                            <span className="font-medium">{varGroup}:</span> {
                              Object.keys(template.variables[varGroup]).join(", ")
                            }
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Event Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(template.eventTypes || []).map((eventType: any, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {eventType.type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{nodes.length}</div>
                        <div className="text-xs text-muted-foreground">States</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{links.length}</div>
                        <div className="text-xs text-muted-foreground">Transitions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{(template.messageRules || []).length}</div>
                        <div className="text-xs text-muted-foreground">Rules</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{Object.keys(template.actions || {}).length}</div>
                        <div className="text-xs text-muted-foreground">Actions</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Link href={`/procedures?template=${template.templateId}`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Play className="h-3 w-3 mr-1" />
                          Create Instance
                        </Button>
                      </Link>
                      <Link href={`/components-lab?template=${template.templateId}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="state-machine" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    State Machine Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nodes.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <D3Graph
                        nodes={nodes}
                        links={links}
                        width={600}
                        height={300}
                        direction="LR"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No state machine defined</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Show Component Boundaries if available */}
              {template.stateMachine?.components && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Component Boundaries
                    </CardTitle>
                    <CardDescription>
                      This template is built from composable state machine components
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(template.stateMachine.components).map(([componentId, component]: [string, any]) => (
                        <div key={componentId} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{componentId}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {component.purpose}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {component.states.map((state: string) => (
                              <Badge key={state} variant="secondary" className="text-xs">
                                {state}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    FSL Definition
                  </CardTitle>
                  <CardDescription>
                    {template.stateMachine?.components 
                      ? "Composable FSL with component boundaries marked" 
                      : "Standard FSL definition"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap">
                    {template.stateMachine?.fsl || "No FSL definition available"}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <div className="space-y-4">
                {(template.messageRules || []).map((rule: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">Rule {index + 1}: {rule.id || `rule_${index}`}</CardTitle>
                      {rule.priority && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rule.matches && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Matches</h4>
                          <div className="bg-muted p-2 rounded text-xs">
                            <div><span className="font-medium">Type:</span> {rule.matches.type}</div>
                            {rule.matches.conditions && Object.entries(rule.matches.conditions).map(([key, value]) => (
                              <div key={key} className="ml-2">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rule.generates && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Generates</h4>
                          <div className="bg-muted p-2 rounded text-xs">
                            <div><span className="font-medium">Type:</span> {rule.generates.type}</div>
                            {rule.generates.template && (
                              <div className="ml-2 mt-1">
                                {rule.generates.template.title && (
                                  <div><span className="font-medium">Title:</span> {rule.generates.template.title}</div>
                                )}
                                {rule.generates.template.content && (
                                  <div><span className="font-medium">Content:</span> {rule.generates.template.content}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {rule.transition && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Transition</h4>
                          <div className="bg-muted p-2 rounded text-xs">
                            <div><span className="font-medium">To:</span> {rule.transition.to}</div>
                            {rule.transition.conditions && (
                              <div className="ml-2 mt-1">
                                {Object.entries(rule.transition.conditions).map(([key, value]) => (
                                  <div key={key}><span className="font-medium">{key}:</span> {String(value)}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(template.messageRules || []).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No message rules defined</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="space-y-4">
                {Object.entries(template.actions || {}).map(([state, actions]: [string, any]) => (
                  <Card key={state}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {state}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.isArray(actions) ? actions.map((action: any, index: number) => (
                          <div key={index} className="bg-muted p-3 rounded text-sm">
                            <div className="font-medium mb-1">{action.type}</div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {Object.entries(action.config || {}).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )) : (
                          <div className="text-muted-foreground text-sm">No actions configured</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {Object.keys(template.actions || {}).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No actions defined</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="playground" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Template Playground
                  </CardTitle>
                  <CardDescription>
                    Test this template with sample data and see how it behaves
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Quick Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/procedures?template=${template.templateId}`}>
                          <Button size="sm">
                            <Play className="h-3 w-3 mr-1" />
                            Create Live Instance
                          </Button>
                        </Link>
                        <Link href={`/components-lab?template=${template.templateId}`}>
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3 mr-1" />
                            Edit in Component Lab
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline">
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate Template
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Sample Variables</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(template.variables || {}).map(([groupKey, group]: [string, any]) => (
                          <div key={groupKey} className="space-y-1">
                            <div className="font-medium text-xs uppercase tracking-wide">{groupKey}</div>
                            {Object.entries(group).map(([key, variable]: [string, any]) => (
                              <div key={key} className="ml-2 flex items-center justify-between">
                                <span>{key}</span>
                                <Badge variant="outline" className="text-xs">
                                  {variable.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Expected Event Types</h4>
                      <div className="space-y-1">
                        {(template.eventTypes || []).map((eventType: any, index: number) => (
                          <div key={index} className="text-sm flex items-center justify-between">
                            <span>{eventType.type}</span>
                            <div className="text-xs text-muted-foreground">
                              {Object.keys(eventType.schema).length} fields
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}