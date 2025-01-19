"use client"

import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { getValueByPath } from "../../utils/eventMatching";
import { Input } from "../ui/input";
import { Pencil, Save } from "lucide-react";
import { fetchFromDb, updateDb } from "../../utils/api";
import { generateMessages } from "../../utils/messageGeneration";

interface Message {
  type: string;
  rule: string;
  fromEvent: string;
}

interface Rule {
  id: string;
  captures?: Record<string, string>;
}

interface Event {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: string;
  processed: boolean;
}

interface Template {
  variables: Record<string, Record<string, any>>;
  messageRules: Rule[];
}

interface Instance {
  events: Event[];
  messages: Message[];
  variables: Record<string, Record<string, any>>;
}

interface VariablesSectionProps {
  procedureId: string;
  template: Template;
  instance: Instance;
}

export const VariablesSection = ({ procedureId, template, instance }: VariablesSectionProps) => {
  const [outputs, setOutputs] = useState<Record<string, Record<string, any>>>({});
  const [editingState, setEditingState] = useState<{
    section: string;
    field: string;
    value: string;
  } | null>(null);
  const [localVariables, setLocalVariables] = useState(instance.variables);

  const fetchVariables = async () => {
    try {
      const data = await fetchFromDb();
      const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
      const template = data.procedureTemplates?.find((t: any) => t.templateId === instance?.templateId);
      
      if (instance && template) {
        const { outputs } = generateMessages(
          instance.history?.events || [],
          template.messageRules || [],
          instance.variables || {}
        );
        setOutputs(outputs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchVariables();
  }, [procedureId]);

  const getCapturedOutputs = () => {
    if (!instance?.messages) return {};
    const outputs: Record<string, Record<string, any>> = {};

    try {
      instance.messages.forEach((message: Message) => {
        const rule = template?.messageRules.find((r: Rule) => r.id === message.rule);
        if (rule?.captures) {
          if (!outputs[message.type]) {
            outputs[message.type] = {};
          }
          Object.entries(rule.captures).forEach(([key, pathTemplate]) => {
            const event = instance.events.find((e: Event) => e.id === message.fromEvent);
            if (event) {
              const pathMatch = pathTemplate.toString().match(/{{event\.data\.(.+)}}/);
              if (pathMatch && pathMatch[1]) {
                const path = pathMatch[1];
                const value = getValueByPath(event.data, path);
                if (value !== undefined) {
                  outputs[message.type][key] = value;
                }
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error processing captured outputs:', error);
    }

    return outputs;
  };

  useEffect(() => {
    const capturedOutputs = getCapturedOutputs();
    setOutputs(capturedOutputs);
  }, [procedureId, instance?.messages, instance?.events]);

  const handleEdit = async (section: string, field: string, value: string) => {
    try {
      const data = await fetchFromDb();
      const instanceIndex = data.procedureInstances?.findIndex((p: any) => p.instanceId === procedureId);
      
      if (instanceIndex === -1) {
        throw new Error('Instance not found');
      }

      // Create a deep copy of the data
      const updatedData = JSON.parse(JSON.stringify(data));

      // Initialize variables object if it doesn't exist
      if (!updatedData.procedureInstances[instanceIndex].variables) {
        updatedData.procedureInstances[instanceIndex].variables = {};
      }
      if (!updatedData.procedureInstances[instanceIndex].variables[section]) {
        updatedData.procedureInstances[instanceIndex].variables[section] = {};
      }

      // Update the variable
      updatedData.procedureInstances[instanceIndex].variables[section][field] = value;

      // Send the update
      await updateDb(updatedData);
      
      // Update local state
      setEditingState(null);
      await fetchVariables();
    } catch (error) {
      console.error('Error updating variable:', error);
      if (error instanceof Error) {
        alert(`Failed to update variable: ${error.message}`);
      } else {
        alert('Failed to update variable. Please try again.');
      }
    }
  };

  return (
    <Card className="p-2">
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-4">
          {/* Instance Variables */}
          {Object.entries(template.variables).map(([section, fields]) => (
            <div key={section} className="space-y-1">
              <h3 className="font-medium capitalize text-sm px-2">{section}</h3>
              <div className="grid gap-1">
                {Object.entries(fields).map(([field, config]: [string, any]) => (
                  <div key={field} className="flex items-center justify-between p-1.5 rounded bg-muted text-xs">
                    <div>
                      <p className="font-medium">{field}</p>
                      <p className="text-muted-foreground text-[10px]">{config.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.required && (
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">Required</span>
                      )}
                      {editingState?.section === section && editingState?.field === field ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            value={editingState.value}
                            onChange={(e) => setEditingState({
                              ...editingState,
                              value: e.target.value
                            })}
                            className="h-6 text-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEdit(section, field, editingState.value)}
                            className="p-1 hover:bg-green-100 rounded"
                          >
                            <Save className="h-3 w-3 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-primary">
                            {localVariables && localVariables[section]?.[field] !== undefined
                              ? localVariables[section][field]
                              : '-'}
                          </span>
                          <button
                            onClick={() => setEditingState({
                              section,
                              field,
                              value: localVariables?.[section]?.[field]?.toString() || ''
                            })}
                            className="p-1 hover:bg-muted-foreground/10 rounded"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Captured Outputs */}
          {Object.entries(outputs).map(([messageType, captures]) => (
            <div key={messageType} className="space-y-1">
              <h3 className="font-medium capitalize text-sm px-2">{messageType} Outputs</h3>
              <div className="grid gap-1">
                {Object.entries(captures).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-1.5 rounded bg-muted text-xs">
                    <div>
                      <p className="font-medium">{key}</p>
                      <p className="text-muted-foreground text-[10px]">Captured from event</p>
                    </div>
                    <span className="text-primary font-mono">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}; 