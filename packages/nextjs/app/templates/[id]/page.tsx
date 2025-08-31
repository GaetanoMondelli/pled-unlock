"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFromDb } from "@/utils/api";
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  GitBranch, 
  Mail, 
  Settings, 
  Star, 
  User,
  Workflow
} from "lucide-react";

interface Template {
  templateId: string;
  name: string;
  description: string;
  variables?: Record<string, any>;
  eventTypes?: Array<{
    type: string;
    schema: Record<string, string>;
  }>;
  messageRules?: Array<{
    matches: any;
    captures?: any;
    generates?: any;
    transition?: any;
  }>;
  stateMachine?: {
    fsl: string;
    initial: string;
    final: string[];
  };
  author?: string;
  company?: string;
  rating?: number;
  downloads?: number;
  lastUpdated?: string;
  featured?: boolean;
  tags?: string[];
  complexity?: "Beginner" | "Intermediate" | "Advanced";
}

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        // First try to load from database
        const data = await fetchFromDb();
        const fromDb = data?.procedureTemplates || [];
        let foundTemplate = fromDb.find((t: any) => t.templateId === id);

        if (!foundTemplate) {
          // Fallback to local JSON
          const res = await fetch("/pled.json", { cache: "no-store" });
          if (res.ok) {
            const local = await res.json();
            foundTemplate = (local.procedureTemplates || []).find((t: any) => t.templateId === id);
          }
        }

        if (foundTemplate) {
          // Enhance template with marketplace data
          setTemplate({
            ...foundTemplate,
            author: foundTemplate.author || "Anonymous",
            company: foundTemplate.company || "Community",
            rating: foundTemplate.rating || Math.random() * 2 + 3,
            downloads: foundTemplate.downloads || Math.floor(Math.random() * 1000 + 10),
            lastUpdated: foundTemplate.lastUpdated || new Date().toISOString(),
            featured: foundTemplate.featured || Math.random() > 0.7,
            tags: foundTemplate.tags || inferTagsFromTemplate(foundTemplate),
            complexity: foundTemplate.complexity || inferComplexity(foundTemplate),
          });
        }
      } catch (error) {
        console.error("Failed to load template:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <Link href="/templates">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Template Not Found</h1>
          <p className="text-gray-600 mb-4">The template with ID "{id}" could not be found.</p>
          <Link href="/templates">
            <Button>Browse Templates</Button>
          </Link>
        </div>
      </div>
    );
  }

  const states = parseStateMachine(template.stateMachine?.fsl || "");

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/templates">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
        
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{template.name}</h1>
              {template.featured && (
                <Star className="h-6 w-6 text-yellow-500 fill-current" />
              )}
            </div>
            <p className="text-gray-600 text-lg mb-3">{template.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{template.author}</span>
              </div>
              {template.company && (
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>{template.company}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span>{template.rating?.toFixed(1)} rating</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span>{template.downloads} downloads</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Updated {new Date(template.lastUpdated || "").toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/procedures?template=${encodeURIComponent(template.templateId)}`}>
              <Button size="lg">
                <Download className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Badge variant="secondary">{template.complexity}</Badge>
          {template.tags?.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
          <TabsTrigger value="rules">Message Rules</TabsTrigger>
          <TabsTrigger value="state-machine">State Machine</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Template Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Template ID:</span>
                    <p className="text-gray-600 font-mono">{template.templateId}</p>
                  </div>
                  <div>
                    <span className="font-medium">Complexity:</span>
                    <p className="text-gray-600">{template.complexity}</p>
                  </div>
                  <div>
                    <span className="font-medium">Variables:</span>
                    <p className="text-gray-600">{Object.keys(template.variables || {}).length} defined</p>
                  </div>
                  <div>
                    <span className="font-medium">Event Types:</span>
                    <p className="text-gray-600">{template.eventTypes?.length || 0} types</p>
                  </div>
                  <div>
                    <span className="font-medium">Message Rules:</span>
                    <p className="text-gray-600">{template.messageRules?.length || 0} rules</p>
                  </div>
                  <div>
                    <span className="font-medium">States:</span>
                    <p className="text-gray-600">{states.length} states</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Workflow Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Initial State:</span>
                    <Badge variant="outline" className="ml-2">
                      {template.stateMachine?.initial || "Not defined"}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Final States:</span>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {template.stateMachine?.final?.map(state => (
                        <Badge key={state} variant="secondary" className="text-xs">
                          {state}
                        </Badge>
                      )) || <span className="text-gray-600">None defined</span>}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <span className="font-medium">Process Flow:</span>
                    <p className="text-gray-600 mt-1 text-xs leading-relaxed">
                      This template defines a workflow with {states.length} states and {template.messageRules?.length || 0} message processing rules.
                      The process starts in the "{template.stateMachine?.initial}" state and can complete in any of the final states.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>Template Variables</CardTitle>
              <CardDescription>
                Variables that can be configured when using this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.variables && Object.keys(template.variables).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(template.variables).map(([groupName, group]: [string, any]) => (
                    <div key={groupName} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 capitalize">{groupName}</h4>
                      <div className="grid gap-3">
                        {Object.entries(group).map(([varName, config]: [string, any]) => (
                          <div key={varName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{varName}</span>
                              <p className="text-sm text-gray-600">
                                Type: {config.type} {config.required && "(Required)"}
                              </p>
                            </div>
                            <Badge variant={config.required ? "default" : "secondary"}>
                              {config.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No variables defined for this template
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>
                Types of events this template can process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.eventTypes && template.eventTypes.length > 0 ? (
                <div className="space-y-4">
                  {template.eventTypes.map((eventType, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="h-4 w-4" />
                        <h4 className="font-medium">{eventType.type}</h4>
                        <Badge variant="outline">{eventType.type.replace(/_/g, " ").toLowerCase()}</Badge>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <h5 className="font-medium text-sm mb-2">Schema:</h5>
                        <div className="grid gap-1">
                          {Object.entries(eventType.schema).map(([field, type]) => (
                            <div key={field} className="flex justify-between text-sm">
                              <span className="font-mono">{field}</span>
                              <Badge variant="secondary" className="text-xs">{type}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No event types defined for this template
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Message Rules</CardTitle>
              <CardDescription>
                Rules that process incoming messages and trigger state transitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.messageRules && template.messageRules.length > 0 ? (
                <div className="space-y-6">
                  {template.messageRules.map((rule, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Rule #{index + 1}</h4>
                      
                      {rule.matches && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Matches:</h5>
                          <div className="bg-blue-50 rounded p-3 text-sm">
                            <div className="font-mono">
                              <div>Type: {rule.matches.type}</div>
                              {rule.matches.conditions && (
                                <div className="mt-2">
                                  <div>Conditions:</div>
                                  <div className="ml-2 space-y-1">
                                    {Object.entries(rule.matches.conditions).map(([key, value]) => (
                                      <div key={key}>• {key}: {String(value)}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {rule.captures && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Captures:</h5>
                          <div className="bg-green-50 rounded p-3 text-sm font-mono">
                            {Object.entries(rule.captures).map(([key, value]) => (
                              <div key={key}>{key}: {String(value)}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rule.generates && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Generates:</h5>
                          <div className="bg-purple-50 rounded p-3 text-sm">
                            <div>Type: {rule.generates.type}</div>
                            {rule.generates.template && (
                              <div className="mt-2">
                                <div>Template:</div>
                                <div className="ml-2 space-y-1 font-mono text-xs">
                                  {Object.entries(rule.generates.template).map(([key, value]) => (
                                    <div key={key}>• {key}: {String(value)}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {rule.transition && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Transition:</h5>
                          <div className="bg-orange-50 rounded p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4" />
                              <span>To: <Badge variant="outline">{rule.transition.to}</Badge></span>
                            </div>
                            {rule.transition.conditions && (
                              <div className="mt-2">
                                <div>Conditions:</div>
                                <div className="ml-2 font-mono text-xs">
                                  {Object.entries(rule.transition.conditions).map(([key, value]) => (
                                    <div key={key}>• {key}: {String(value)}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No message rules defined for this template
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="state-machine">
          <Card>
            <CardHeader>
              <CardTitle>State Machine Definition</CardTitle>
              <CardDescription>
                The workflow state transitions defined in FSL (Finite State Language)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.stateMachine ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">FSL Definition:</h4>
                    <div className="bg-gray-50 rounded p-4 font-mono text-sm border">
                      <pre className="whitespace-pre-wrap">{template.stateMachine.fsl}</pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Initial State
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="font-mono">
                          {template.stateMachine.initial}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          All States
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {states.map(state => (
                            <Badge key={state} variant="secondary" className="text-xs font-mono">
                              {state}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-red-600" />
                          Final States
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {template.stateMachine.final?.length > 0 ? (
                            template.stateMachine.final.map(state => (
                              <Badge key={state} variant="destructive" className="text-xs font-mono">
                                {state}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-600">None defined</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">State Transitions:</h4>
                    <div className="space-y-2">
                      {parseTransitions(template.stateMachine.fsl).map((transition, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                          <Badge variant="outline" className="font-mono">{transition.from}</Badge>
                          <span className="text-gray-500">on</span>
                          <Badge variant="secondary" className="font-mono">{transition.trigger}</Badge>
                          <span className="text-gray-500">→</span>
                          <Badge variant="outline" className="font-mono">{transition.to}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No state machine defined for this template
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function inferTagsFromTemplate(template: any): string[] {
  const tags: string[] = [];
  const text = `${template.name} ${template.description}`.toLowerCase();

  if (text.includes("document")) tags.push("document-processing");
  if (text.includes("email")) tags.push("email-workflow");
  if (text.includes("approval")) tags.push("approval-process");
  if (text.includes("sign")) tags.push("e-signature");
  if (text.includes("hire")) tags.push("recruitment");
  if (text.includes("onboard")) tags.push("onboarding");
  if (text.includes("contract")) tags.push("contract-management");
  if (text.includes("review")) tags.push("review-process");

  return tags.length > 0 ? tags : ["workflow"];
}

function inferComplexity(template: any): "Beginner" | "Intermediate" | "Advanced" {
  const messageRulesCount = template.messageRules?.length || 0;
  const statesCount = parseStateMachine(template.stateMachine?.fsl || "").length;

  if (messageRulesCount <= 2 && statesCount <= 4) return "Beginner";
  if (messageRulesCount <= 5 && statesCount <= 8) return "Intermediate";
  return "Advanced";
}

function parseStateMachine(fsl: string): string[] {
  const states = new Set<string>();
  const transitions = fsl.split(";").filter(Boolean);
  
  transitions.forEach(transition => {
    const match = transition.trim().match(/(\w+)\s+['"]([^'"]+)['"]?\s*->\s*(\w+)/);
    if (match) {
      states.add(match[1]);  // from state
      states.add(match[3]);  // to state
    }
  });
  
  return Array.from(states);
}

function parseTransitions(fsl: string): Array<{from: string, trigger: string, to: string}> {
  const transitions: Array<{from: string, trigger: string, to: string}> = [];
  const transitionStrings = fsl.split(";").filter(Boolean);
  
  transitionStrings.forEach(transition => {
    const match = transition.trim().match(/(\w+)\s+['"]([^'"]+)['"]?\s*->\s*(\w+)/);
    if (match) {
      transitions.push({
        from: match[1],
        trigger: match[2],
        to: match[3]
      });
    }
  });
  
  return transitions;
}

