"use client"

import { Card } from "./card";
import { ScrollArea } from "./scroll-area";
import pledData from "@/public/pled.json";
import { getValueByPath } from "../../utils/eventMatching";

interface VariablesViewProps {
  procedureId: string;
}

export const VariablesView = ({ procedureId }: VariablesViewProps) => {
  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  );

  const getCapturedOutputs = () => {
    const outputs: Record<string, Record<string, any>> = {};
    
    const template = pledData.procedureTemplates.find(
      t => t.templateId === "hiring_process"
    );
    
    instance?.messages?.forEach(message => {
      const rule = template?.messageRules.find(r => r.id === message.rule);
      if (rule?.captures) {
        if (!outputs[message.type]) {
          outputs[message.type] = {};
        }
        Object.entries(rule.captures).forEach(([key, pathTemplate]) => {
          const event = instance.events.find(e => e.id === message.fromEvent);
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
    
    return outputs;
  };

  const getAllVariables = () => {
    const baseVars = instance?.variables || {};
    const capturedVars = getCapturedOutputs();
    
    // Convert captured vars to match instance variables format
    const capturedFormatted = Object.entries(capturedVars).reduce((acc, [messageType, captures]) => {
      const sectionName = `${messageType} outputs`;
      acc[sectionName] = captures;
      return acc;
    }, {} as Record<string, any>);

    return {
      ...baseVars,
      ...capturedFormatted
    };
  };

  return (
    <Card className="w-full">
      <ScrollArea className="h-[85vh]">
        <div className="p-4 space-y-4">
          <h3 className="font-semibold">Variables</h3>
          {Object.entries(getAllVariables()).map(([section, vars]) => (
            <div key={section} className="space-y-1">
              <h4 className="text-sm font-medium capitalize">{section}</h4>
              <div className="pl-2 space-y-1">
                {Object.entries(vars).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{key}:</span>
                    <span className="font-mono">{value}</span>
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