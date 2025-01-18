"use client"

import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import pledData from "@/public/pled.json";
import { getValueByPath } from "../../utils/eventMatching";

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

  useEffect(() => {
    const capturedOutputs = getCapturedOutputs();
    setOutputs(capturedOutputs);
  }, [procedureId, instance?.messages]);

  const getCapturedOutputs = () => {
    if (!instance?.messages) return {};

    const outputs: Record<string, Record<string, any>> = {};
    const receivedEvents = pledData.receivedEvents || [];
    
    try {
      instance.messages.forEach((message: Message) => {
        const rule = template?.messageRules.find((r: Rule) => r.id === message.rule);
        if (rule?.captures) {
          if (!outputs[message.type]) {
            outputs[message.type] = {};
          }
          Object.entries(rule.captures).forEach(([key, pathTemplate]) => {
            const event = receivedEvents.find((e: Event) => e.id === message.fromEvent);
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
                    <div className="flex items-center gap-1.5">
                      {config.required && (
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">Required</span>
                      )}
                      <span className="text-primary">
                        {instance.variables[section as keyof Variables]?.[field as keyof Variables[keyof Variables]] || '-'}
                      </span>
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