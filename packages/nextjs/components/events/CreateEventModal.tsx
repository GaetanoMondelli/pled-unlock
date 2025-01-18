"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import pledData from "@/public/pled.json";
import { matchEventToRule } from "../../utils/eventMatching";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: any) => Promise<void>;
}

const EVENT_TEMPLATES = {
  EMAIL_RECEIVED: {
    from: "john@example.com",
    to: "hr@company.com",
    subject: "Interview request",
    body: "I would like to schedule an interview",
    time: new Date().toISOString()
  },
  DOCUMENT_UPLOADED: {
    filename: "resume.pdf",
    type: "application/pdf",
    url: "https://example.com/files/resume.pdf"
  },
  DOCUSIGN_EVENT: {
    envelopeStatus: "sent",
    envelopeId: "ENV-123",
    recipientStatus: ["sent"],
    recipients: [{
      email: "john@example.com",
      status: "sent",
      sentAt: new Date().toISOString()
    }]
  },
  HR_EVENT: {
    action: "approve_candidate",
    decision: "approved",
    candidateId: "CAND-123",
    approver: "hr@company.com"
  }
};

export const CreateEventModal = ({ open, onClose, onSave }: CreateEventModalProps) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedEnvelope, setSelectedEnvelope] = useState<string>("");
  
  // Raw event form state
  const [eventType, setEventType] = useState("EMAIL_RECEIVED");
  const [eventData, setEventData] = useState(() => 
    JSON.stringify(EVENT_TEMPLATES["EMAIL_RECEIVED"], null, 2)
  );

  // Add state for rule matching
  const [matchingRules, setMatchingRules] = useState<any[]>([]);
  const [nonMatchingRules, setNonMatchingRules] = useState<any[]>([]);

  // Add state for expanded rules
  const [expandedRules, setExpandedRules] = useState<string[]>([]);

  // Update event type handler to set template
  const handleEventTypeChange = (type: string) => {
    setEventType(type);
    setEventData(JSON.stringify(EVENT_TEMPLATES[type as keyof typeof EVENT_TEMPLATES], null, 2));
  };

  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRules(prev => 
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
  };

  // Update the rule matching check to interpolate variables and show specific conditions
  const checkRuleMatching = (data: any) => {
    try {
      const template = pledData.procedureTemplates.find(t => t.templateId === "hiring_process");
      if (!template) return;

      const event = { type: eventType, data };
      const matching = [];
      const nonMatching = [];

      // Get instance variables for interpolation
      const instance = pledData.procedureInstances[0]; // or pass instance as prop
      const variables = instance?.variables || {};

      for (const rule of template.messageRules) {
        if (rule.matches.type === eventType) {
          try {
            const matches = matchEventToRule(
              event,
              { type: rule.matches.type, conditions: rule.matches.conditions },
              variables
            );

            if (matches) {
              matching.push(rule);
            } else {
              // Add detailed condition comparison with interpolated values
              const conditionDetails = Object.entries(rule.matches.conditions || {}).map(([field, condition]) => {
                // Get actual value from event data
                const actualValue = field.split('.').reduce((obj, key) => obj?.[key], data);
                
                // Interpolate the expected value template
                let expectedTemplate = condition.toString();
                const interpolated = expectedTemplate.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
                  return path.split('.')
                    .reduce((obj, key) => obj?.[key], variables) || match;
                });

                // Parse the condition
                const operatorMatch = interpolated.match(/^\((.*?)\)\s*(.*)/);
                const operator = operatorMatch ? operatorMatch[1] : 'equals';
                const expectedValue = operatorMatch ? operatorMatch[2] : interpolated;

                return {
                  field,
                  operator,
                  expected: expectedValue,
                  actual: actualValue || 'undefined',
                  template: condition.toString(),
                  matches: false // You can implement actual condition matching here
                };
              });

              nonMatching.push({
                rule,
                reason: "Conditions do not match",
                details: conditionDetails
              });
            }
          } catch (error) {
            console.error("Error matching rule:", error);
            nonMatching.push({
              rule,
              reason: "Error matching rule",
              details: []
            });
          }
        } else {
          nonMatching.push({
            rule,
            reason: `Wrong type: expected ${rule.matches.type}`,
            details: [{
              field: 'type',
              operator: 'equals',
              expected: rule.matches.type,
              actual: eventType,
              template: rule.matches.type,
              matches: false
            }]
          });
        }
      }

      setMatchingRules(matching);
      setNonMatchingRules(nonMatching);
    } catch (error) {
      console.error("Error in checkRuleMatching:", error);
      setMatchingRules([]);
      setNonMatchingRules([]);
    }
  };

  // Update the effect to be more defensive
  useEffect(() => {
    try {
      const parsedData = JSON.parse(eventData);
      checkRuleMatching(parsedData);
    } catch (error) {
      console.error("Invalid JSON:", error);
      setMatchingRules([]);
      setNonMatchingRules([]);
    }
  }, [eventData, eventType]);

  const handleRawEventSubmit = async () => {
    try {
      const parsedData = JSON.parse(eventData);
      await onSave({
        type: eventType,
        template: {
          source: "manual",
          data: parsedData
        }
      });
    } catch (error) {
      console.error("Invalid JSON data:", error);
    }
  };

  const handleApiExecution = async () => {
    // TODO: Implement API execution
    console.log("Executing API:", selectedEndpoint);
  };

  const handleGmailImport = async () => {
    // TODO: Implement Gmail import
    console.log("Importing from Gmail");
  };

  const handleDocusignAction = async () => {
    // TODO: Implement DocuSign action
    console.log("Executing DocuSign action:", selectedAction, selectedEnvelope);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="raw">
          <TabsList>
            <TabsTrigger value="raw">Raw Event</TabsTrigger>
            <TabsTrigger value="api">API Execution</TabsTrigger>
            <TabsTrigger value="gmail">Gmail Import</TabsTrigger>
            <TabsTrigger value="docusign">DocuSign Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="raw">
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <Label>Event Type</Label>
                  <Select value={eventType} onValueChange={handleEventTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL_RECEIVED">Email Received</SelectItem>
                      <SelectItem value="DOCUMENT_UPLOADED">Document Uploaded</SelectItem>
                      <SelectItem value="DOCUSIGN_EVENT">DocuSign Event</SelectItem>
                      <SelectItem value="HR_EVENT">HR Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Event Data (JSON)</Label>
                  <Textarea
                    value={eventData}
                    onChange={(e) => setEventData(e.target.value)}
                    className="font-mono"
                    rows={10}
                  />
                </div>

                {/* Rule Matching Info */}
                {matchingRules.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-600">Matching Rules:</h4>
                    <div className="space-y-1">
                      {matchingRules.map(rule => (
                        <div key={rule.id} className="text-xs bg-green-50 text-green-700 p-2 rounded">
                          {rule.id}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nonMatchingRules.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-600">Non-Matching Rules:</h4>
                    <div className="space-y-1">
                      {nonMatchingRules.map(({ rule, reason, details }) => (
                        <div 
                          key={rule.id} 
                          className="text-xs bg-yellow-50 text-yellow-700 rounded overflow-hidden"
                        >
                          <div 
                            className="p-2 flex items-center justify-between cursor-pointer hover:bg-yellow-100"
                            onClick={() => toggleRuleExpand(rule.id)}
                          >
                            <div>
                              <span className="font-medium">{rule.id}</span>
                              <span className="ml-2">{reason}</span>
                            </div>
                            {expandedRules.includes(rule.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                          
                          {expandedRules.includes(rule.id) && details.length > 0 && (
                            <div className="border-t border-yellow-200 bg-yellow-50/50 p-2">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-yellow-800">
                                    <th className="p-1">Field</th>
                                    <th className="p-1">Operator</th>
                                    <th className="p-1">Expected</th>
                                    <th className="p-1">Actual</th>
                                    <th className="p-1">Template</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.map((detail, i) => (
                                    <tr key={i} className="border-t border-yellow-200/50">
                                      <td className="p-1 font-medium">{detail.field}</td>
                                      <td className="p-1 italic">{detail.operator}</td>
                                      <td className="p-1">{detail.expected}</td>
                                      <td className="p-1">{detail.actual}</td>
                                      <td className="p-1 text-gray-500">{detail.template}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleRawEventSubmit}>
                  Create Event
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">Execute API Endpoint</h3>
              <div className="space-y-4">
                <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select endpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="get_users">Get Users</SelectItem>
                    <SelectItem value="check_status">Check Status</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="space-y-2">
                  <Label>Parameters</Label>
                  {/* Dynamic parameter inputs based on selected endpoint */}
                </div>

                <Button onClick={handleApiExecution}>
                  Execute
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="gmail">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">Import from Gmail</h3>
              <div className="space-y-4">
                <div>
                  <Label>Search Filter</Label>
                  <Input 
                    placeholder="from:example@gmail.com subject:interview"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label>Time Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="datetime-local" />
                    <Input type="datetime-local" />
                  </div>
                </div>

                <Button onClick={handleGmailImport}>
                  Import Emails
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="docusign">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">DocuSign Actions</h3>
              <div className="space-y-4">
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_status">Check Envelope Status</SelectItem>
                    <SelectItem value="get_recipients">Get Recipients</SelectItem>
                    <SelectItem value="download_doc">Download Document</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedEnvelope} onValueChange={setSelectedEnvelope}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select envelope" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Fetch and display actual envelopes */}
                    <SelectItem value="env1">Envelope 1</SelectItem>
                    <SelectItem value="env2">Envelope 2</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleDocusignAction}>
                  Execute Action
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}; 