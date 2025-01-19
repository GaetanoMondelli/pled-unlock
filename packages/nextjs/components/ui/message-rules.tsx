"use client"

import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import pledData from "@/public/pled.json";
import { formatTemplateContent } from "@/components/ui/template-content";

interface MessageRulesProps {
  procedureId: string;
}

export default function MessageRules({ procedureId }: MessageRulesProps) {
  const [expandedRules, setExpandedRules] = useState<string[]>([]);

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  );
  
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(
    t => t.templateId === instance.templateId
  );

  if (!template) return null;

  return (
    <div className="space-y-8 mr-4">
      {/* Message Rules - Collapsible */}
      <div>
        <h3 className="font-semibold mb-4">Rules</h3>
        <div className="space-y-2">
          {template.messageRules.map((rule) => (
            <Card key={rule.id} className="p-2">
              <Button
                variant="ghost"
                className="w-full flex justify-between items-center"
                onClick={() => toggleRule(rule.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">Rule: {rule.id}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Priority {rule.priority}
                  </span>
                </div>
                {expandedRules.includes(rule.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {expandedRules.includes(rule.id) && (
                <div className="p-2 space-y-4">
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
                            {key === 'timestamp' ? (
                              formatTemplateContent(`${key}: {{event.data.time}}`, instance.variables)
                            ) : (
                              formatTemplateContent(`${key}: ${value}`, instance.variables)
                            )}
                          </pre>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Generated Messages - Table Format */}
      <div>
        <h3 className="font-semibold mb-4">Generated Messages</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Rule</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instance.history?.messages?.map((message) => (
              <TableRow key={message.id}>
                <TableCell className="text-xs">
                  {new Date(message.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {message.type}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{message.title}</div>
                    <div className="text-xs text-muted-foreground">{message.content}</div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{message.fromEvent}</TableCell>
                <TableCell>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {(() => {
                      const matchingRule = template.messageRules
                        .sort((a, b) => a.priority - b.priority)  // Sort by priority
                        .find(r => r.generates.type === message.type);
                      return matchingRule 
                        ? `${matchingRule.id} (P${matchingRule.priority})`
                        : 'unknown';
                    })()}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

