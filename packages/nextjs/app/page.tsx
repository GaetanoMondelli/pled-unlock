"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchFromDb } from "../utils/api";
import { CreateProcedureModal } from "@/components/procedures/CreateProcedureModal";
import { CreateTemplateModal } from "@/components/templates/CreateTemplateModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateCurrentState, createStateMachine } from "@/lib/fsm";
import { handleEventAndGenerateMessages } from "@/utils/stateAndMessageHandler";
import { format } from "date-fns";
import { Activity, Building2, Calendar, GitBranch, MessageCircle, PlusCircle, Timer, User } from "lucide-react";

// Add these types at the top of the file
interface StateMetadata {
  actions?: string[];
  description?: string;
  documents?: string[];
}

interface DebugInfo {
  instanceId: string;
  currentState: string;
  eventCount: number;
  messageCount: number;
  transitionCount: number;
  lastTransition?: any;
  lastMessage?: any;
  isInitialState: boolean;
  isFinalState: boolean;
  stateMetadata: StateMetadata;
}

interface Template {
  templateId: string;
  name: string;
  description: string;
  stateMachine: {
    fsl: string;
    initial: string;
    final: string[];
    states: Record<string, StateMetadata>;
  };
  messageRules: any[];
  variables: Record<string, any>;
}

interface Instance {
  instanceId: string;
  templateId: string;
  variables: Record<string, any>;
  history: {
    events: Event[];
    messages: any[];
  };
  startDate: string;
}

// Add the date formatting helper
const formatDate = (dateString?: string) => {
  if (!dateString) return "No date";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

export default function Home() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchFromDb();
      setTemplates(data.procedureTemplates || []);
      setInstances(data.procedureInstances || []);
    };
    loadData();
  }, []);

  const handleCreateProcedure = async (data: any) => {
    try {
      const response = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create procedure");

      // Refresh the data
      const newData = await fetchFromDb();
      setTemplates(newData.procedureTemplates || []);
      setInstances(newData.procedureInstances || []);
    } catch (error) {
      console.error("Error creating procedure:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4">
      <div className="flex gap-4">
        <CreateProcedureModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateProcedure}
        />
        <CreateTemplateModal />
      </div>
      <div className="container mx-auto p-6">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Procedures</h1>
          <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
            <PlusCircle className="h-5 w-5" />
            New Procedure
          </Button>
        </div>

        {templates.map(template => (
          <div key={template.templateId} className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{template.name}</h2>
            <p className="text-muted-foreground mb-4">{template.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instances
                .filter(instance => instance.templateId === template.templateId)
                .map((instance: any) => {
                  // Get history data with proper null checks
                  const history = instance.history || {};
                  const events = history.events || [];

                  // Process events to generate messages and transitions (like in procedure-state.tsx)
                  let currentState = "idle";
                  const generatedMessages: any[] = [];
                  const allTransitions: any[] = [];

                  // Process each event to generate messages
                  for (const event of events) {
                    const result = handleEventAndGenerateMessages(
                      event,
                      template.messageRules || [],
                      instance.variables || {},
                      currentState,
                      template.stateMachine.fsl,
                    );

                    generatedMessages.push(...result.messages);
                    allTransitions.push(...result.transitions);
                    currentState = result.finalState;
                  }

                  // Calculate current state using generated messages
                  currentState = calculateCurrentState(template.stateMachine.fsl, generatedMessages);

                  // Extract nodes to get state metadata
                  const stateSet = new Set<string>();
                  template.stateMachine.fsl.split(";").forEach((line: string) => {
                    line = line.trim();
                    if (line) {
                      const sourceState = line.split(/\s+/)[0];
                      const targetState = line.split("->")[1]?.trim();

                      if (sourceState) stateSet.add(sourceState);
                      if (targetState) stateSet.add(targetState);
                    }
                  });

                  // Find final states (states with no outgoing transitions)
                  const finalStates = new Set(Array.from(stateSet));
                  template.stateMachine.fsl.split(";").forEach((line: string) => {
                    line = line.trim();
                    if (line) {
                      const sourceState = line.split(/\s+/)[0];
                      finalStates.delete(sourceState);
                    }
                  });

                  // Get state metadata and status
                  const stateMetadata = template.stateMachine.states?.[currentState] || {};

                  // Check initial state more explicitly
                  const isInitialState =
                    currentState === "idle" ||
                    currentState === template.stateMachine.initial ||
                    // Also check if it's the first state in FSL
                    template.stateMachine.fsl.trim().startsWith(currentState);
                  const isFinalState = finalStates.has(currentState);

                  // Update debug info to use generated messages
                  const debugInfo = {
                    instanceId: instance.instanceId,
                    currentState,
                    history: {
                      events: {
                        count: events.length,
                        items: events.map((e: any) => ({
                          type: e.type,
                          timestamp: e.timestamp,
                          data: e.data,
                        })),
                      },
                      generatedMessages: {
                        count: generatedMessages.length,
                        items: generatedMessages,
                      },
                      transitions: {
                        count: allTransitions.length,
                        items: allTransitions,
                      },
                    },
                    state: {
                      current: currentState,
                      isInitial: isInitialState,
                      isFinal: isFinalState,
                      metadata: stateMetadata,
                      possibleTransitions: template.stateMachine.fsl
                        .split(";")
                        .map((line: string) => line.trim())
                        .filter((line: string) => line.startsWith(currentState))
                        .map((line: string) => {
                          const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
                          return match ? { action: match[2], target: match[3] } : null;
                        })
                        .filter(Boolean),
                    },
                    lastActivity:
                      generatedMessages[generatedMessages.length - 1]?.timestamp ||
                      events[events.length - 1]?.timestamp,
                    startDate: instance.startDate,
                  };

                  console.debug("Instance Debug:", debugInfo);

                  return (
                    <Link key={instance.instanceId} href={`/procedures/${instance.instanceId}`}>
                      <Card className="hover:shadow-lg transition-shadow group">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <CardTitle className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {instance.variables?.candidate?.name ||
                                  Object.entries(instance.variables || {})[0]?.[0] ||
                                  "Unnamed"}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {instance.variables?.company?.department ||
                                  ((Object.entries(instance.variables)[0]?.[1] as { department?: string })?.department) ||
                                  "No department"}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={getStateBadgeVariant(currentState, isInitialState, isFinalState)}
                              className="capitalize"
                            >
                              {currentState}
                            </Badge>
                          </div>

                          {/* Add debug section that shows on hover */}
                          <div
                            data-debug
                            className="hidden group-hover:block absolute right-2 top-2 z-10 bg-black/90 text-white p-2 rounded text-xs"
                          >
                            <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              <span>{generatedMessages.length} msgs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <span>{events.length} events</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitBranch className="h-4 w-4 text-muted-foreground" />
                              <span>{template.templateId}</span>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Started:{" "}
                                {instance.startDate
                                  ? format(new Date(instance.startDate), "MMM d, yyyy")
                                  : "Not started"}
                              </span>
                            </div>
                            {debugInfo.lastActivity && (
                              <div className="flex items-center gap-1">
                                <Timer className="h-4 w-4" />
                                <span>Last activity: {format(new Date(debugInfo.lastActivity), "MMM d")}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Update the state badge helper function
function getStateBadgeVariant(
  state: string,
  isInitial: boolean,
  isFinal: boolean,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  // Initial states - blue
  if (isInitial) {
    return "secondary";
  }

  // Final states - red
  if (isFinal) {
    return "destructive";
  }

  // In-progress states - green
  return "success";
}
