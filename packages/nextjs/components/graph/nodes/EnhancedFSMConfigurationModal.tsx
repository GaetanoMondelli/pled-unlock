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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Plus,
  Trash2,
  Activity,
  ArrowRight,
  Code,
  Target,
  Play,
  Save,
  MessageCircle,
  Zap,
  Brain,
  GitBranch,
  Shield,
  Info,
  Edit3,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EnhancedFSMProcessNode,
  EnhancedFSMState,
  EnhancedFSMTransition,
  EventInterpretationRule,
  EnhancedFSMAction,
  ActionOutput,
  EventInput,
  MessageInput,
  FeedbackLoopConfig,
} from "@/lib/simulation/enhanced-fsm-schema";
import { useSimulationStore } from "@/stores/simulationStore";

interface EnhancedFSMConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  currentConfig: EnhancedFSMProcessNode;
}

const EnhancedFSMConfigurationModal: React.FC<EnhancedFSMConfigurationModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  currentConfig,
}) => {
  const updateNodeConfigInStore = useSimulationStore(state => state.updateNodeConfigInStore);

  // Main FSM state
  const [states, setStates] = useState<EnhancedFSMState[]>(currentConfig.fsm?.states || []);
  const [transitions, setTransitions] = useState<EnhancedFSMTransition[]>(currentConfig.fsm?.transitions || []);
  const [initialState, setInitialState] = useState(currentConfig.fsm?.initialState || "");
  const [variables, setVariables] = useState(currentConfig.fsm?.variables || {});

  // Input streams
  const [eventInputs, setEventInputs] = useState<EventInput[]>(currentConfig.eventInputs || []);
  const [messageInputs, setMessageInputs] = useState<MessageInput[]>(currentConfig.messageInputs || []);

  // Interpretation rules
  const [interpretationRules, setInterpretationRules] = useState<EventInterpretationRule[]>(
    currentConfig.fsm?.interpretationRules || []
  );

  // Feedback configuration
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackLoopConfig>(
    currentConfig.fsm?.feedbackConfig || {
      enabled: true,
      maxDepth: 10,
      circuitBreaker: {
        enabled: true,
        threshold: 100,
        timeWindow: 60000,
        cooldownPeriod: 30000,
      },
      routing: {
        allowSelfFeedback: true,
        allowExternalFeedback: true,
        blacklistedNodes: [],
      },
    }
  );

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Form helpers
  const [newStateName, setNewStateName] = useState("");
  const [newEventInputName, setNewEventInputName] = useState("");
  const [newMessageInputName, setNewMessageInputName] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStates(currentConfig.fsm?.states || []);
      setTransitions(currentConfig.fsm?.transitions || []);
      setInitialState(currentConfig.fsm?.initialState || "");
      setVariables(currentConfig.fsm?.variables || {});
      setEventInputs(currentConfig.eventInputs || []);
      setMessageInputs(currentConfig.messageInputs || []);
      setInterpretationRules(currentConfig.fsm?.interpretationRules || []);
      setFeedbackConfig(currentConfig.fsm?.feedbackConfig || {
        enabled: true,
        maxDepth: 10,
        circuitBreaker: {
          enabled: true,
          threshold: 100,
          timeWindow: 60000,
          cooldownPeriod: 30000,
        },
        routing: {
          allowSelfFeedback: true,
          allowExternalFeedback: true,
          blacklistedNodes: [],
        },
      });
    }
  }, [isOpen, currentConfig]);

  // State management functions
  const addState = () => {
    if (newStateName.trim() && !states.find(s => s.id === newStateName.trim())) {
      const newState: EnhancedFSMState = {
        id: newStateName.trim(),
        name: newStateName.trim(),
        type: "intermediate",
        actions: [],
      };
      setStates([...states, newState]);
      if (!initialState) {
        setInitialState(newState.id);
      }
      setNewStateName("");
    }
  };

  const removeState = (stateId: string) => {
    if (states.length > 1) {
      setStates(states.filter(s => s.id !== stateId));
      setTransitions(transitions.filter(t => t.from !== stateId && t.to !== stateId));
      if (initialState === stateId) {
        setInitialState(states.find(s => s.id !== stateId)?.id || "");
      }
    }
  };

  const updateState = (stateId: string, updates: Partial<EnhancedFSMState>) => {
    setStates(states.map(state =>
      state.id === stateId ? { ...state, ...updates } : state
    ));
  };

  // Transition management
  const addTransition = () => {
    if (states.length >= 2) {
      const newTransition: EnhancedFSMTransition = {
        id: `trans_${Date.now()}`,
        from: states[0].id,
        to: states[1].id,
        trigger: {
          type: "message",
          messageType: "event",
        },
        priority: 100,
      };
      setTransitions([...transitions, newTransition]);
    }
  };

  const removeTransition = (transitionId: string) => {
    setTransitions(transitions.filter(t => t.id !== transitionId));
  };

  const updateTransition = (transitionId: string, updates: Partial<EnhancedFSMTransition>) => {
    setTransitions(transitions.map(transition =>
      transition.id === transitionId ? { ...transition, ...updates } : transition
    ));
  };

  // Input management
  const addEventInput = () => {
    if (newEventInputName.trim()) {
      const newInput: EventInput = {
        name: newEventInputName.trim(),
        required: false,
        bufferSize: 1000,
      };
      setEventInputs([...eventInputs, newInput]);
      setNewEventInputName("");
    }
  };

  const addMessageInput = () => {
    if (newMessageInputName.trim()) {
      const newInput: MessageInput = {
        name: newMessageInputName.trim(),
        required: false,
        interface: { type: "object", requiredFields: [] },
        bufferSize: 100,
      };
      setMessageInputs([...messageInputs, newInput]);
      setNewMessageInputName("");
    }
  };

  // Interpretation rule management
  const addInterpretationRule = () => {
    const newRule: EventInterpretationRule = {
      id: `rule_${Date.now()}`,
      name: "New Rule",
      enabled: true,
      priority: 100,
      conditions: {},
      method: {
        type: "passthrough",
        messageType: "processed_event",
      },
    };
    setInterpretationRules([...interpretationRules, newRule]);
  };

  const updateInterpretationRule = (ruleId: string, updates: Partial<EventInterpretationRule>) => {
    setInterpretationRules(rules =>
      rules.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule)
    );
  };

  const removeInterpretationRule = (ruleId: string) => {
    setInterpretationRules(rules => rules.filter(rule => rule.id !== ruleId));
  };

  // Save configuration
  const handleSave = () => {
    const updatedConfig: EnhancedFSMProcessNode = {
      ...currentConfig,
      eventInputs,
      messageInputs,
      fsm: {
        states,
        transitions,
        initialState,
        variables,
        interpretationRules,
        feedbackConfig,
        outputs: currentConfig.fsm?.outputs || [],
      },
    };

    const success = updateNodeConfigInStore(nodeId, updatedConfig);
    if (success) {
      console.log("Enhanced FSM configuration saved successfully");
      onClose();
    } else {
      console.error("Failed to save Enhanced FSM configuration");
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Enhanced FSM Configuration: {currentConfig.displayName}
          </DialogTitle>
          <DialogDescription>
            Configure dual input streams, interpretation rules, state machine logic, and feedback loops.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="inputs" className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Inputs
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                Rules
              </TabsTrigger>
              <TabsTrigger value="states" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                States
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Actions
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                Feedback
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Input Streams</h3>
                  <div className="text-2xl font-bold text-blue-700">{eventInputs.length + messageInputs.length}</div>
                  <div className="text-sm text-blue-600">
                    {eventInputs.length} Events • {messageInputs.length} Messages
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">States & Transitions</h3>
                  <div className="text-2xl font-bold text-green-700">{states.length}</div>
                  <div className="text-sm text-green-600">
                    {transitions.length} Transitions
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">Interpretation Rules</h3>
                  <div className="text-2xl font-bold text-purple-700">{interpretationRules.length}</div>
                  <div className="text-sm text-purple-600">
                    {interpretationRules.filter(r => r.enabled).length} Active
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">FSM Flow Overview</h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span>Events & Messages → Interpretation Rules → State Machine → Actions → Outputs</span>
                    </div>
                    <div className="text-gray-600">
                      Events are processed through interpretation rules to generate messages,
                      which trigger state transitions and execute actions that can create feedback loops.
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Current Configuration</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Initial State:</span>
                      <span className="ml-2 font-mono">{initialState || "None"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Feedback Enabled:</span>
                      <span className="ml-2">{feedbackConfig.enabled ? "Yes" : "No"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Depth:</span>
                      <span className="ml-2">{feedbackConfig.maxDepth}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Circuit Breaker:</span>
                      <span className="ml-2">{feedbackConfig.circuitBreaker?.enabled ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Inputs Tab */}
            <TabsContent value="inputs" className="flex-1 overflow-auto space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Event Inputs ({eventInputs.length})
                    </Label>
                    <Button onClick={addEventInput} size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Event Input
                    </Button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Event input name"
                      value={newEventInputName}
                      onChange={(e) => setNewEventInputName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addEventInput()}
                    />
                    <Button onClick={addEventInput} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-3">
                      {eventInputs.map((input, index) => (
                        <div key={index} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Input
                              value={input.name}
                              onChange={(e) => {
                                const updated = [...eventInputs];
                                updated[index] = { ...input, name: e.target.value };
                                setEventInputs(updated);
                              }}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEventInputs(eventInputs.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={input.required}
                                onCheckedChange={(checked) => {
                                  const updated = [...eventInputs];
                                  updated[index] = { ...input, required: !!checked };
                                  setEventInputs(updated);
                                }}
                              />
                              <label>Required</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label>Buffer:</label>
                              <Input
                                type="number"
                                value={input.bufferSize}
                                onChange={(e) => {
                                  const updated = [...eventInputs];
                                  updated[index] = { ...input, bufferSize: parseInt(e.target.value) || 1000 };
                                  setEventInputs(updated);
                                }}
                                className="h-6"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {eventInputs.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          No event inputs configured
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Message Inputs ({messageInputs.length})
                    </Label>
                    <Button onClick={addMessageInput} size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Message Input
                    </Button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Message input name"
                      value={newMessageInputName}
                      onChange={(e) => setNewMessageInputName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addMessageInput()}
                    />
                    <Button onClick={addMessageInput} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-3">
                      {messageInputs.map((input, index) => (
                        <div key={index} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Input
                              value={input.name}
                              onChange={(e) => {
                                const updated = [...messageInputs];
                                updated[index] = { ...input, name: e.target.value };
                                setMessageInputs(updated);
                              }}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMessageInputs(messageInputs.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={input.required}
                                onCheckedChange={(checked) => {
                                  const updated = [...messageInputs];
                                  updated[index] = { ...input, required: !!checked };
                                  setMessageInputs(updated);
                                }}
                              />
                              <label>Required</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label>Buffer:</label>
                              <Input
                                type="number"
                                value={input.bufferSize}
                                onChange={(e) => {
                                  const updated = [...messageInputs];
                                  updated[index] = { ...input, bufferSize: parseInt(e.target.value) || 100 };
                                  setMessageInputs(updated);
                                }}
                                className="h-6"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {messageInputs.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          No message inputs configured
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* Interpretation Rules Tab */}
            <TabsContent value="rules" className="flex-1 overflow-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Event Interpretation Rules</h3>
                  <p className="text-sm text-gray-600">
                    Rules that transform raw events into structured messages
                  </p>
                </div>
                <Button onClick={addInterpretationRule} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </div>

              <ScrollArea className="h-96 border rounded-lg p-4">
                <div className="space-y-4">
                  {interpretationRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) =>
                              updateInterpretationRule(rule.id, { enabled: checked })
                            }
                          />
                          <Input
                            value={rule.name}
                            onChange={(e) =>
                              updateInterpretationRule(rule.id, { name: e.target.value })
                            }
                            className="font-medium"
                          />
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.method.type}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInterpretationRule(rule.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Priority</Label>
                          <Input
                            type="number"
                            value={rule.priority}
                            onChange={(e) =>
                              updateInterpretationRule(rule.id, { priority: parseInt(e.target.value) || 100 })
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Method Type</Label>
                          <Select
                            value={rule.method.type}
                            onValueChange={(value) =>
                              updateInterpretationRule(rule.id, {
                                method: {
                                  type: value as any,
                                  messageType: "processed_event",
                                }
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pattern">Pattern Matching</SelectItem>
                              <SelectItem value="formula">Formula</SelectItem>
                              <SelectItem value="ai">AI/LLM</SelectItem>
                              <SelectItem value="script">Custom Script</SelectItem>
                              <SelectItem value="passthrough">Pass-through</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {rule.description && (
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={rule.description}
                            onChange={(e) =>
                              updateInterpretationRule(rule.id, { description: e.target.value })
                            }
                            className="h-16 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {interpretationRules.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No interpretation rules configured
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* States Tab */}
            <TabsContent value="states" className="flex-1 overflow-auto space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* States Panel */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-medium">States ({states.length})</Label>
                    <Button onClick={addState} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add State
                    </Button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="State name"
                      value={newStateName}
                      onChange={(e) => setNewStateName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addState()}
                    />
                    <Button onClick={addState} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="h-64 border rounded p-2">
                    <div className="space-y-2">
                      {states.map((state) => (
                        <div key={state.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={state.id === initialState ? "default" : "outline"}
                              className={cn(
                                "text-xs",
                                state.id === initialState && "bg-green-100 text-green-800 border-green-300"
                              )}
                            >
                              {state.name}
                              {state.id === initialState && " (initial)"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {state.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {state.id !== initialState && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInitialState(state.id)}
                                className="h-6 px-2 text-xs"
                              >
                                Set Initial
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeState(state.id)}
                              disabled={states.length <= 1}
                              className="h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Transitions Panel */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-medium">Transitions ({transitions.length})</Label>
                    <Button onClick={addTransition} size="sm" disabled={states.length < 2}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <ScrollArea className="h-80 border rounded p-2">
                    <div className="space-y-3">
                      {transitions.map((transition) => (
                        <div key={transition.id} className="border rounded p-3 space-y-2">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <Select
                                value={transition.from}
                                onValueChange={(value) =>
                                  updateTransition(transition.id, { from: value })
                                }
                              >
                                <SelectTrigger className="w-24 h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {states.map(state => (
                                    <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <ArrowRight className="h-3 w-3" />
                              <Select
                                value={transition.to}
                                onValueChange={(value) =>
                                  updateTransition(transition.id, { to: value })
                                }
                              >
                                <SelectTrigger className="w-24 h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {states.map(state => (
                                    <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTransition(transition.id)}
                              className="h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="space-y-1">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Trigger Type</Label>
                                <Select
                                  value={transition.trigger.type}
                                  onValueChange={(value) =>
                                    updateTransition(transition.id, {
                                      trigger: {
                                        type: value as any,
                                        messageType: value === "message" ? "event" : undefined,
                                        eventType: value === "event" ? "event" : undefined,
                                        timeout: value === "timer" ? 1000 : undefined,
                                        condition: value === "condition" ? "true" : undefined,
                                      }
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="message">Message</SelectItem>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="timer">Timer</SelectItem>
                                    <SelectItem value="condition">Condition</SelectItem>
                                    <SelectItem value="manual">Manual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Priority</Label>
                                <Input
                                  type="number"
                                  value={transition.priority}
                                  onChange={(e) =>
                                    updateTransition(transition.id, { priority: parseInt(e.target.value) || 100 })
                                  }
                                  className="h-7"
                                />
                              </div>
                            </div>

                            {transition.trigger.type === "message" && (
                              <div>
                                <Label className="text-xs">Message Type</Label>
                                <Input
                                  value={(transition.trigger as any).messageType || ""}
                                  onChange={(e) =>
                                    updateTransition(transition.id, {
                                      trigger: { ...transition.trigger, messageType: e.target.value }
                                    })
                                  }
                                  className="h-7 text-xs"
                                  placeholder="e.g., token_received"
                                />
                              </div>
                            )}

                            {transition.trigger.type === "event" && (
                              <div>
                                <Label className="text-xs">Event Type</Label>
                                <Input
                                  value={(transition.trigger as any).eventType || ""}
                                  onChange={(e) =>
                                    updateTransition(transition.id, {
                                      trigger: { ...transition.trigger, eventType: e.target.value }
                                    })
                                  }
                                  className="h-7 text-xs"
                                  placeholder="e.g., document_received"
                                />
                              </div>
                            )}

                            {transition.trigger.type === "timer" && (
                              <div>
                                <Label className="text-xs">Timeout (ms)</Label>
                                <Input
                                  type="number"
                                  value={(transition.trigger as any).timeout || 1000}
                                  onChange={(e) =>
                                    updateTransition(transition.id, {
                                      trigger: { ...transition.trigger, timeout: parseInt(e.target.value) || 1000 }
                                    })
                                  }
                                  className="h-7 text-xs"
                                />
                              </div>
                            )}

                            {transition.trigger.type === "condition" && (
                              <div>
                                <Label className="text-xs">Condition Formula</Label>
                                <Input
                                  value={(transition.trigger as any).condition || ""}
                                  onChange={(e) =>
                                    updateTransition(transition.id, {
                                      trigger: { ...transition.trigger, condition: e.target.value }
                                    })
                                  }
                                  className="h-7 text-xs"
                                  placeholder="e.g., variables.count > 5"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="flex-1 overflow-auto">
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="font-medium mb-2">Enhanced Action System</h3>
                <p className="text-sm">
                  Actions will be configured per state with support for multiple output types,
                  including token emission, API calls, feedback events, and more.
                </p>
              </div>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="flex-1 overflow-auto space-y-6">
              <div>
                <h3 className="font-medium mb-4">Feedback Loop Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Enable Feedback Loops</Label>
                      <Switch
                        checked={feedbackConfig.enabled}
                        onCheckedChange={(checked) =>
                          setFeedbackConfig(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Maximum Recursion Depth</Label>
                      <Input
                        type="number"
                        value={feedbackConfig.maxDepth}
                        onChange={(e) =>
                          setFeedbackConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) || 10 }))
                        }
                        className="mt-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Routing Options</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={feedbackConfig.routing.allowSelfFeedback}
                            onCheckedChange={(checked) =>
                              setFeedbackConfig(prev => ({
                                ...prev,
                                routing: { ...prev.routing, allowSelfFeedback: !!checked }
                              }))
                            }
                          />
                          <label className="text-sm">Allow self-feedback</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={feedbackConfig.routing.allowExternalFeedback}
                            onCheckedChange={(checked) =>
                              setFeedbackConfig(prev => ({
                                ...prev,
                                routing: { ...prev.routing, allowExternalFeedback: !!checked }
                              }))
                            }
                          />
                          <label className="text-sm">Allow external feedback</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Circuit Breaker</Label>
                      <Switch
                        checked={feedbackConfig.circuitBreaker?.enabled}
                        onCheckedChange={(checked) =>
                          setFeedbackConfig(prev => ({
                            ...prev,
                            circuitBreaker: { ...prev.circuitBreaker!, enabled: checked }
                          }))
                        }
                      />
                    </div>

                    {feedbackConfig.circuitBreaker?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Event Threshold</Label>
                          <Input
                            type="number"
                            value={feedbackConfig.circuitBreaker.threshold}
                            onChange={(e) =>
                              setFeedbackConfig(prev => ({
                                ...prev,
                                circuitBreaker: {
                                  ...prev.circuitBreaker!,
                                  threshold: parseInt(e.target.value) || 100
                                }
                              }))
                            }
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Time Window (ms)</Label>
                          <Input
                            type="number"
                            value={feedbackConfig.circuitBreaker.timeWindow}
                            onChange={(e) =>
                              setFeedbackConfig(prev => ({
                                ...prev,
                                circuitBreaker: {
                                  ...prev.circuitBreaker!,
                                  timeWindow: parseInt(e.target.value) || 60000
                                }
                              }))
                            }
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Cooldown Period (ms)</Label>
                          <Input
                            type="number"
                            value={feedbackConfig.circuitBreaker.cooldownPeriod}
                            onChange={(e) =>
                              setFeedbackConfig(prev => ({
                                ...prev,
                                circuitBreaker: {
                                  ...prev.circuitBreaker!,
                                  cooldownPeriod: parseInt(e.target.value) || 30000
                                }
                              }))
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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

export default EnhancedFSMConfigurationModal;