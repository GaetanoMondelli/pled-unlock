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
import {
  Settings,
  Plus,
  Trash2,
  Activity,
  ArrowRight,
  Code,
  Target,
  Play,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FSMProcessNode } from "@/lib/simulation/types";
import { useSimulationStore } from "@/stores/simulationStore";

interface FSMConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  currentConfig: FSMProcessNode;
}

const FSMConfigurationModal: React.FC<FSMConfigurationModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  currentConfig
}) => {
  const updateNodeConfigInStore = useSimulationStore(state => state.updateNodeConfigInStore);
  const [fslCode, setFslCode] = useState(currentConfig.fsl || "");
  const [states, setStates] = useState<string[]>(currentConfig.fsm?.states || []);
  const [initialState, setInitialState] = useState(currentConfig.fsm?.initialState || "");
  const [transitions, setTransitions] = useState(currentConfig.fsm?.transitions || []);
  const [stateActions, setStateActions] = useState(currentConfig.fsm?.stateActions || {});
  const [newStateName, setNewStateName] = useState("");

  // FSL Parser - same as in fsl-editor.tsx
  const parseFSL = (fslCode: string) => {
    const result = {
      states: [] as string[],
      transitions: [] as any[],
      stateActions: {} as any,
      errors: [] as string[]
    };

    try {
      const lines = fslCode.split('\n').map(line => line.trim()).filter(Boolean);
      let currentState: string | null = null;

      for (const line of lines) {
        // State definition: state stateName { ... }
        if (line.startsWith('state ')) {
          const stateMatch = line.match(/state\s+(\w+)\s*\{?/);
          if (stateMatch) {
            currentState = stateMatch[1];
            if (!result.states.includes(currentState)) {
              result.states.push(currentState);
              result.stateActions[currentState] = { logs: [], onEntry: [], onExit: [] };
            }
          }
        }
        // Transition: on trigger -> targetState
        else if (line.includes('->') && currentState) {
          const transitionMatch = line.match(/on\s+(.+?)\s*->\s*(\w+)/);
          if (transitionMatch) {
            const trigger = transitionMatch[1].trim();
            const targetState = transitionMatch[2];

            // Check if it's a condition-based transition
            if (trigger.includes('.') || trigger.includes('>') || trigger.includes('<') || trigger.includes('=')) {
              result.transitions.push({
                from: currentState,
                to: targetState,
                trigger: 'condition',
                condition: trigger
              });
            } else {
              result.transitions.push({
                from: currentState,
                to: targetState,
                trigger: trigger
              });
            }
          }
        }
        // Actions: on_entry { action(...) }
        else if (line.includes('on_entry') && currentState) {
          const actions = line.match(/(\w+)\([^)]*\)/g);
          if (actions) {
            actions.forEach(actionStr => {
              const actionMatch = actionStr.match(/(\w+)\((.+?)\)/);
              if (actionMatch) {
                const action = actionMatch[1];
                const params = actionMatch[2].replace(/['"]/g, '');

                if (action === 'log') {
                  result.stateActions[currentState].onEntry.push({
                    action: 'log',
                    value: params
                  });
                } else if (action === 'emit') {
                  const [target, formula] = params.split(',').map(s => s.trim());
                  result.stateActions[currentState].onEntry.push({
                    action: 'emit',
                    target: target,
                    formula: formula
                  });
                }
              }
            });
          }
        }
      }
    } catch (error) {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const fslCode = currentConfig.fsl || "";
      setFslCode(fslCode);

      // If FSL exists, parse it to populate the visual editor
      if (fslCode.trim()) {
        const parsed = parseFSL(fslCode);
        if (parsed.errors.length === 0) {
          setStates(parsed.states);
          setInitialState(parsed.states[0] || ""); // First state as initial
          setTransitions(parsed.transitions);
          setStateActions(parsed.stateActions);
        } else {
          console.warn("FSL parsing errors:", parsed.errors);
          // Fall back to existing config
          setStates(currentConfig.fsm?.states || []);
          setInitialState(currentConfig.fsm?.initialState || "");
          setTransitions(currentConfig.fsm?.transitions || []);
          setStateActions(currentConfig.fsm?.stateActions || {});
        }
      } else {
        // No FSL, use existing config
        setStates(currentConfig.fsm?.states || []);
        setInitialState(currentConfig.fsm?.initialState || "");
        setTransitions(currentConfig.fsm?.transitions || []);
        setStateActions(currentConfig.fsm?.stateActions || {});
      }
    }
  }, [isOpen, currentConfig]);

  const addState = () => {
    if (newStateName.trim() && !states.includes(newStateName.trim())) {
      const newState = newStateName.trim();
      setStates([...states, newState]);
      setStateActions({
        ...stateActions,
        [newState]: { logs: [], onEntry: {}, onExit: {} }
      });
      if (!initialState) {
        setInitialState(newState);
      }
      setNewStateName("");
    }
  };

  const removeState = (stateName: string) => {
    if (states.length > 1) {
      setStates(states.filter(s => s !== stateName));
      // Remove from state actions
      const newStateActions = { ...stateActions };
      delete newStateActions[stateName];
      setStateActions(newStateActions);
      // Remove transitions involving this state
      setTransitions(transitions.filter(t => t.from !== stateName && t.to !== stateName));
      // Reset initial state if this was it
      if (initialState === stateName) {
        setInitialState(states.find(s => s !== stateName) || "");
      }
    }
  };

  const addTransition = () => {
    if (states.length >= 2) {
      const newTransition = {
        from: states[0],
        to: states[1],
        trigger: "event",
        condition: ""
      };
      setTransitions([...transitions, newTransition]);
    }
  };

  const updateTransition = (index: number, field: string, value: string) => {
    const newTransitions = [...transitions];
    newTransitions[index] = { ...newTransitions[index], [field]: value };
    setTransitions(newTransitions);
  };

  const removeTransition = (index: number) => {
    setTransitions(transitions.filter((_, i) => i !== index));
  };

  const updateStateAction = (stateName: string, actionType: 'onEntry' | 'onExit' | 'logs', value: any) => {
    setStateActions({
      ...stateActions,
      [stateName]: {
        ...stateActions[stateName],
        [actionType]: value
      }
    });
  };

  const handleSave = () => {
    // Convert states to objects with actions
    const stateObjects = states.map(stateName => ({
      name: stateName,
      isInitial: stateName === initialState,
      isFinal: false,
      onEntry: stateActions[stateName]?.onEntry || [],
      onExit: stateActions[stateName]?.onExit || []
    }));

    const updatedConfig = {
      ...currentConfig,
      fsl: fslCode,
      fsm: {
        states: stateObjects,  // Use state objects instead of strings
        initialState,
        transitions,
        stateActions,
        outputs: currentConfig.fsm?.outputs || ["output"]
      }
    };

    const success = updateNodeConfigInStore(nodeId, updatedConfig);
    if (success) {
      console.log("FSM configuration saved successfully");
      onClose();
    } else {
      console.error("Failed to save FSM configuration");
    }
  };

  const generateFSLFromVisual = () => {
    let fsl = "";

    states.forEach(state => {
      fsl += `state ${state} {\n`;

      // Add state actions
      const actions = stateActions[state];
      if (actions?.onEntry && Object.keys(actions.onEntry).length > 0) {
        Object.entries(actions.onEntry).forEach(([output, formula]) => {
          fsl += `  on_entry { emit(${output}, ${formula}) }\n`;
        });
      }

      if (actions?.logs && actions.logs.length > 0) {
        actions.logs.forEach(log => {
          fsl += `  on_entry { log("${log}") }\n`;
        });
      }

      // Add transitions from this state
      const stateTransitions = transitions.filter(t => t.from === state);
      stateTransitions.forEach(transition => {
        if (transition.condition) {
          fsl += `  on ${transition.condition} -> ${transition.to}\n`;
        } else {
          fsl += `  on ${transition.trigger} -> ${transition.to}\n`;
        }
      });

      fsl += "}\n\n";
    });

    setFslCode(fsl.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure FSM: {currentConfig.displayName}
          </DialogTitle>
          <DialogDescription>
            Define states, transitions, and actions for the Finite State Machine processor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="visual" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="visual" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Visual Editor
              </TabsTrigger>
              <TabsTrigger value="fsl" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                FSL Code
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                State Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* States Panel */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">FSM States ({states.length})</Label>
                    <div className="flex gap-2 mt-1">
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
                  </div>

                  <ScrollArea className="h-48 border rounded p-2">
                    <div className="space-y-2">
                      {states.map((state) => (
                        <div key={state} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={state === initialState ? "default" : "outline"}
                              className={cn(
                                "text-xs",
                                state === initialState && "bg-green-100 text-green-800 border-green-300"
                              )}
                            >
                              {state}
                              {state === initialState && " (initial)"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {state !== initialState && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInitialState(state)}
                                className="h-6 px-2 text-xs"
                              >
                                Set Initial
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeState(state)}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Transitions</Label>
                    <Button onClick={addTransition} size="sm" disabled={states.length < 2}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <ScrollArea className="h-48 border rounded p-2">
                    <div className="space-y-2">
                      {transitions.map((transition, index) => (
                        <div key={index} className="p-2 border rounded space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <select
                              value={transition.from}
                              onChange={(e) => updateTransition(index, 'from', e.target.value)}
                              className="border rounded px-2 py-1 text-xs"
                            >
                              {states.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                            <ArrowRight className="h-3 w-3" />
                            <select
                              value={transition.to}
                              onChange={(e) => updateTransition(index, 'to', e.target.value)}
                              className="border rounded px-2 py-1 text-xs"
                            >
                              {states.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTransition(index)}
                              className="h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Input
                              placeholder="Trigger (e.g., 'token_received')"
                              value={transition.trigger}
                              onChange={(e) => updateTransition(index, 'trigger', e.target.value)}
                              className="text-xs"
                            />
                            <Input
                              placeholder="Condition (optional, e.g., 'input.data.value > 0')"
                              value={transition.condition || ""}
                              onChange={(e) => updateTransition(index, 'condition', e.target.value)}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fsl" className="flex-1 overflow-hidden">
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">FSL Definition</Label>
                  <Button onClick={generateFSLFromVisual} variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Generate from Visual
                  </Button>
                </div>
                <Textarea
                  value={fslCode}
                  onChange={(e) => setFslCode(e.target.value)}
                  placeholder="Enter FSL code here..."
                  className="font-mono text-sm flex-1 min-h-96"
                />
              </div>
            </TabsContent>

            <TabsContent value="actions" className="flex-1 overflow-hidden">
              <div className="space-y-4">
                <Label className="text-sm font-medium">State Actions</Label>
                <ScrollArea className="h-96 border rounded p-4">
                  <div className="space-y-4">
                    {states.map((state) => (
                      <div key={state} className="border rounded p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {state}
                          </Badge>
                          <span className="text-sm text-slate-600">Actions</span>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-slate-600">On Entry - Emit Tokens</Label>

                          {/* Existing emit actions */}
                          <div className="space-y-2">
                            {Object.entries(stateActions[state]?.onEntry || {}).map(([outputName, formula], idx) => (
                              <div key={idx} className="grid grid-cols-2 gap-2">
                                <Input
                                  value={outputName}
                                  placeholder="Output name"
                                  className="text-xs"
                                  onChange={(e) => {
                                    const newOutputName = e.target.value;
                                    const currentActions = { ...stateActions[state]?.onEntry };
                                    delete currentActions[outputName];
                                    if (newOutputName) {
                                      currentActions[newOutputName] = formula;
                                    }
                                    updateStateAction(state, 'onEntry', currentActions);
                                  }}
                                />
                                <div className="flex gap-1">
                                  <Input
                                    value={formula}
                                    placeholder="Formula (e.g., input.data.value)"
                                    className="text-xs flex-1"
                                    onChange={(e) => {
                                      updateStateAction(state, 'onEntry', {
                                        ...stateActions[state]?.onEntry,
                                        [outputName]: e.target.value
                                      });
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newActions = { ...stateActions[state]?.onEntry };
                                      delete newActions[outputName];
                                      updateStateAction(state, 'onEntry', newActions);
                                    }}
                                    className="h-8 px-2"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add new emit action */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOutputName = `output${Object.keys(stateActions[state]?.onEntry || {}).length + 1}`;
                              updateStateAction(state, 'onEntry', {
                                ...stateActions[state]?.onEntry,
                                [newOutputName]: "input.data.value"
                              });
                            }}
                            className="w-full text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Emit Action
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-slate-600">Log Messages</Label>

                          {/* Existing log messages */}
                          <div className="space-y-1">
                            {(stateActions[state]?.logs || []).map((log, idx) => (
                              <div key={idx} className="flex gap-1">
                                <Input
                                  value={log}
                                  placeholder="Log message"
                                  className="text-xs flex-1"
                                  onChange={(e) => {
                                    const newLogs = [...(stateActions[state]?.logs || [])];
                                    newLogs[idx] = e.target.value;
                                    updateStateAction(state, 'logs', newLogs);
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newLogs = stateActions[state].logs.filter((_, i) => i !== idx);
                                    updateStateAction(state, 'logs', newLogs);
                                  }}
                                  className="h-8 px-2"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* Add new log message */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateStateAction(state, 'logs', [
                                ...(stateActions[state]?.logs || []),
                                "New log message"
                              ]);
                            }}
                            className="w-full text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Log Message
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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

export default FSMConfigurationModal;