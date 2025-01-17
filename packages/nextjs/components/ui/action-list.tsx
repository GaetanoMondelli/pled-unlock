"use client"

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Calendar, 
  Bell, 
  FileSignature,
  LucideIcon
} from "lucide-react";
import pledData from "@/public/pled.json";
import { TemplateVariable } from "./template-variable";

// Define action type icons mapping
const actionIcons: Record<string, LucideIcon> = {
  "SEND_EMAIL": Mail,
  "CREATE_CALENDAR_EVENT": Calendar,
  "SEND_REMINDER": Bell,
  "DOCUSIGN_SEND": FileSignature,
};

interface ActionListProps {
  procedureId: string;
}

export const ActionList = ({ procedureId }: ActionListProps) => {
  const [expandedActions, setExpandedActions] = useState<string[]>([]);

  const instance = pledData.procedureInstances.find(p => p.instanceId === procedureId);
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(t => t.templateId === instance.templateId);
  if (!template) return null;

  const toggleActions = (state: string) => {
    setExpandedActions(prev =>
      prev.includes(state)
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const actionEntries = Object.entries(template.actions || {}).map(([state, actions]) => ({
    state,
    actions: Array.isArray(actions) ? actions : [actions]
  }));

  const renderTemplateValue = (key: string, value: string) => {
    // Special handling for arrays (like attendees)
    if (Array.isArray(value)) {
      return value.map((v, i) => (
        <TemplateVariable 
          key={i} 
          text={v} 
          variables={instance.variables} 
        />
      )).reduce((prev, curr) => (
        <>{prev}, {curr}</>
      ));
    }

    // Handle multiline text (like email body)
    if (key === 'body' || key === 'message') {
      return (
        <div className="whitespace-pre-line">
          <TemplateVariable 
            text={value} 
            variables={instance.variables} 
          />
        </div>
      );
    }

    // Default handling
    return (
      <TemplateVariable 
        text={value.toString()} 
        variables={instance.variables} 
      />
    );
  };

  return (
    <div className="space-y-4">
      {actionEntries.map(({ state, actions }) => (
        <div key={state} className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-accent"
            onClick={() => toggleActions(state)}
          >
            <span className="font-medium">{state}</span>
            {expandedActions.includes(state) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {expandedActions.includes(state) && (
            <div className="p-4 space-y-6 bg-accent/50">
              {actions.map((action, index) => {
                const ActionIcon = actionIcons[action.type] || ChevronRight;
                return (
                  <div key={index} className="bg-background rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <ActionIcon className="h-5 w-5 text-primary" />
                      <h3 className="font-medium text-primary">
                        {action.type}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(action.template || {}).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[120px,1fr] gap-4 items-start">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {key}:
                          </span>
                          <div className="text-sm">
                            {renderTemplateValue(key, value as string)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ActionList;

