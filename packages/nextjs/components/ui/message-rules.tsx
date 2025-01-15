"use client"

import { Card } from "@/components/ui/card";
import pledData from "@/public/pled.json";
import { formatTemplateContent } from "@/components/ui/template-content";

interface MessageRulesProps {
  procedureId: string;
}

export default function MessageRules({ procedureId }: MessageRulesProps) {
  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  );
  
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(
    t => t.templateId === instance.templateId
  );

  if (!template) return null;

  return (
    <div className="space-y-8">
      {/* Message Rules */}
      <div>
        <h3 className="font-semibold mb-4">Rules</h3>
        <div className="space-y-4">
          {template.messageRules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="space-y-4">
                {/* Rule Matching */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Matches</h4>
                  <div className="bg-muted rounded-md p-2">
                    <p className="text-sm mb-1">Event Type: {rule.matches.type}</p>
                    <div className="space-y-1">
                      {Object.entries(rule.matches.conditions).map(([key, value]) => (
                        <pre key={key} className="text-xs">
                          {formatTemplateContent(`${key}: ${value}`, instance.variables)}
                        </pre>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generated Message Template */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Generates Message</h4>
                  <div className="bg-muted rounded-md p-2">
                    <p className="text-sm mb-1">Type: {rule.generates.type}</p>
                    <div className="space-y-1">
                      {Object.entries(rule.generates.template).map(([key, value]) => (
                        <pre key={key} className="text-xs">
                          {formatTemplateContent(`${key}: ${value}`, instance.variables)}
                        </pre>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Generated Messages */}
      <div>
        <h3 className="font-semibold mb-4">Generated Messages</h3>
        <div className="space-y-4">
          {instance.messages.map((message) => (
            <Card key={message.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{message.title}</h4>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{message.content}</p>
              <div className="flex gap-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {message.type}
                </span>
                <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                  From Event: {message.fromEvent}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

