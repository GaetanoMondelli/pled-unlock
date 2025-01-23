"use client"

import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTemplateContent } from "@/components/ui/template-content";
import { fetchFromDb } from "../../utils/api";
import { generateMessages } from "../../utils/messageGeneration";
import { matchEventToRule } from "../../utils/eventMatching";

interface MessageRulesProps {
  procedureId: string;
}

export default function MessageRules({ procedureId }: MessageRulesProps) {
  const [expandedRules, setExpandedRules] = useState<string[]>([]);
  const [instance, setInstance] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [generatedMessages, setGeneratedMessages] = useState<any[]>([]);
  const [outputs, setOutputs] = useState<Record<string, any>>({});

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchFromDb();
        const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
        const template = data.procedureTemplates?.find((t: any) => t.templateId === instance?.templateId);
        
        if (!instance || !template) {
          throw new Error('Procedure not found');
        }

        setInstance(instance);
        setTemplate(template);

        console.log('Debug Info:', {
          events: instance.history?.events || [],
          rules: template.messageRules || [],
          variables: instance.variables || {}
        });

        // Generate messages based on events
        const { messages, outputs } = generateMessages(
          instance.history?.events || [],
          template.messageRules || [],
          instance.variables || {}
        );

        console.log('Generated Messages:', messages);
        console.log('Generated Outputs:', outputs);

        setGeneratedMessages(messages);
        setOutputs(outputs);

        console.log('Generated Messages Debug:', messages.map(msg => ({
          id: msg.id,
          timestamp: msg.timestamp,
          eventTime: msg.event?.data?.time,
          eventTimestamp: msg.event?.timestamp,
          raw: msg
        })));

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, [procedureId]);

  if (!instance || !template) return null;

  function getRuleMatchingInfo(event: any, rules: any[]) {
    return rules.map(rule => {
      // Normalize rule structure to match what works in messageGeneration
      const normalizedRule = {
        type: rule.matches.type,
        conditions: rule.matches.conditions
      };
      
      const matches = matchEventToRule(event, normalizedRule, {});
      return {
        ruleId: rule.id,
        matches,
        reason: !matches ? getNotMatchingReason(event, normalizedRule) : 'Matches!'
      };
    });
  }

  function getNotMatchingReason(event: any, rule: any): string {
    // Normalize the rule structure
    const ruleType = typeof rule.type === 'string' ? rule.type : rule.matches?.type;
    
    if (ruleType !== event.type) {
      return `Event type '${event.type}' doesn't match rule type '${ruleType}'`;
    }

    // Get conditions from the appropriate place in the rule structure
    const conditions = rule.conditions || rule.matches?.conditions;

    if (!conditions) {
      return 'No conditions defined';
    }

    const failedConditions = Object.entries(conditions)
      .map(([path, expectedValue]) => {
        const actualValue = path.split('.')
          .reduce((obj: any, key: string) => obj?.[key], event.data);
        
        if (actualValue === undefined) {
          return `Path '${path}' not found in event data`;
        }

        if (typeof expectedValue === 'string' && expectedValue.includes('{{')) {
          return null; // Template variables always match if path exists
        }

        if (actualValue !== expectedValue) {
          return `Expected '${expectedValue}' at path '${path}', but got '${actualValue}'`;
        }

        return null;
      })
      .filter(Boolean);

    return failedConditions.join(', ');
  }

  return (
    <div className="space-y-8 mr-4">
      {/* Debug Section
      <div>
        <h3 className="font-semibold mb-4">Debug Info</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Events:</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(instance.history?.events || [], null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Rule Matching Analysis:</h4>
            {(instance.history?.events || []).map((event: any) => (
              <div key={event.id} className="mb-4 bg-muted p-2 rounded">
                <p className="text-xs font-medium">Event: {event.type} ({event.id})</p>
                <div className="ml-4">
                  {getRuleMatchingInfo(event, template.messageRules || []).map((info) => (
                    <div key={info.ruleId} className="text-xs flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${info.matches ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-medium">{info.ruleId}:</span>
                      <span className={info.matches ? 'text-green-600' : 'text-red-600'}>
                        {info.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Message Rules:</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(template.messageRules || [], null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Variables:</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(instance.variables || {}, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Generated Messages:</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(generatedMessages, null, 2)}
            </pre>
          </div>
        </div>
      </div> */}

      {/* Message Rules - Collapsible */}
      <div>
        <h3 className="font-semibold mb-4">Rules</h3>
        <div className="space-y-2">
          {(template.messageRules || []).map((rule: any) => (
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

      {/* Captured Outputs section */}
      {Object.keys(outputs).length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Captured Outputs</h3>
          <div className="space-y-4">
            {Object.entries(outputs).map(([messageType, captures]) => (
              <div key={messageType} className="space-y-1">
                <h4 className="text-sm font-medium capitalize">{messageType}</h4>
                <div className="grid gap-1">
                  {Object.entries(captures).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-1.5 rounded bg-muted text-xs">
                      <div>
                        <p className="font-medium">{key}</p>
                        <p className="text-muted-foreground text-[10px]">Captured from event</p>
                      </div>
                      <span className="text-primary font-mono">
                        {JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {generatedMessages.map((message: any) => (
              <TableRow key={message.id}>
                <TableCell className="text-xs">
                  {message.timestamp ? (
                    new Date(message.timestamp).toLocaleString()
                  ) : (
                    message.event?.data?.time ? (
                      new Date(message.event.data.time).toLocaleString()
                    ) : (
                      new Date(message.event?.timestamp).toLocaleString()
                    )
                  )}
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
                    {message.rule}
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

