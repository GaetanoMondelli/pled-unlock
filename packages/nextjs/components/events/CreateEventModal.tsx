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
import { matchEventToRule } from "../../utils/eventMatching";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { DocuSignService } from "../../lib/docusign-service";
import { getProcedureData, fetchFromDb } from "~~/utils/api";
import { getNotMatchingReason } from "../../utils/message-rules";
import { handleEventAndGenerateMessages } from "../../utils/stateAndMessageHandler";
import { useSearchParams, usePathname } from 'next/navigation';

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
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

const fetchProcedureState = async (procedureId: string) => {
  try {
    const data = await getProcedureData(procedureId);
    
    // Find the current state from the procedure data
    const currentState = data.currentState || 'idle';
    const fsmDefinition = data.template?.stateMachine?.fsl || '';

    return {
      currentState,
      fsmDefinition
    };
  } catch (error) {
    console.error('Error fetching procedure state:', error);
    throw new Error('Failed to fetch procedure state');
  }
};

export const CreateEventModal = ({ open, onClose, onSave }: CreateEventModalProps) => {
  // Get procedureId from URL
  const pathname = usePathname();
  const procedureId = pathname?.split('/').pop()?.split('?')[0]; // This will get 'proc_123' from the URL

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

  // Add state for DocuSign data
  const [envelopes, setEnvelopes] = useState<Array<{id: string, status: string}>>([]);
  const [isLoadingEnvelopes, setIsLoadingEnvelopes] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Initialize DocuSign service
  const [docusignService] = useState(() => new DocuSignService());

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [templateRules, setTemplateRules] = useState<any[]>([]);
  const [instanceVariables, setInstanceVariables] = useState<any>({});

  // Add state for expanded rule debug
  const [expandedRuleDebug, setExpandedRuleDebug] = useState<string[]>([]);

  // Add this state for the debug section
  const [showDebug, setShowDebug] = useState(false);

  // Add state for Navigator API call
  const [isLoadingAgreement, setIsLoadingAgreement] = useState(false);

  // Add state for Navigator API result
  const [navigatorResult, setNavigatorResult] = useState<any>(null);

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

  // Add useEffect to fetch rules when modal opens
  useEffect(() => {
    if (open) {
      fetchRules();
    }
  }, [open, procedureId]); // Dependencies: open state and procedureId

  // Update the fetchRules function
  const fetchRules = async () => {
    try {
      console.log('Fetching rules for procedure:', procedureId);
      const data = await fetchFromDb();
      
      // Find the instance and template
      const instance = data.procedureInstances?.find(
        (p: any) => p.instanceId === procedureId
      );
      const template = data.procedureTemplates?.find(
        (t: any) => t.templateId === instance?.templateId
      );

      if (!instance || !template) {
        console.error('Instance or template not found:', { instance, template });
        return;
      }

      console.log('Fetched rules:', {
        messageRules: template.messageRules,
        variables: instance.variables
      });

      setTemplateRules(template.messageRules || []);
      setInstanceVariables(instance.variables || {});
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  // Update the rule matching check
  const checkRuleMatching = (data: any) => {
    try {
      const event = { type: eventType, data };
      const matching = [];
      const nonMatching = [];

      for (const rule of templateRules) {
        if (rule.matches.type === eventType) {
          try {
            const matches = matchEventToRule(
              event,
              { type: rule.matches.type, conditions: rule.matches.conditions },
              instanceVariables
            );

            if (matches) {
              matching.push(rule);
            } else {
              // Add detailed condition comparison with interpolated values
              const conditionDetails = Object.entries(rule.matches.conditions || {}).map(([field, condition]: [string, any]) => {
                // Get actual value from event data
                const actualValue = field.split('.').reduce((obj, key) => obj?.[key], data);
                
                // Interpolate the expected value template
                let expectedTemplate = condition.toString();
                const interpolated = expectedTemplate.replace(/\{\{([^}]+)\}\}/g, (match: string, path: string) => {
                  return path.split('.')
                    .reduce((obj: any, key: string) => obj?.[key], instanceVariables) || match;
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
                  matches: false
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
      
      // Create event template
      const template = {
        id: `${eventType.toLowerCase()}_${Date.now()}`,
        name: `${eventType} Event`,
        description: `${eventType} event created manually`,
        type: eventType,
        procedureId,
        template: {
          source: "manual",
          data: parsedData
        }
      };

      // Make direct API call to add event
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: template,
          action: 'add_template',
          procedureId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to add event');
      }

      const result = await response.json();
      
      // Call onSave to trigger parent refresh
      await onSave(result.event);
      onClose();
    } catch (error) {
      console.error("Error creating event:", error);
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

  // Update handleTabChange to use proper authentication
  const handleTabChange = async (tab: string) => {
    if (tab === 'docusign' && !isAuthenticated) {
      setIsAuthenticating(true);
      try {
        // First get the config
        await docusignService.getConfig();
        // Then authenticate
        await docusignService.authenticate();
        setIsAuthenticated(true);
        // After authentication, fetch envelopes
        await fetchEnvelopes();
      } catch (error) {
        console.error('Authentication failed:', error);
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

  // Update fetchEnvelopes to not handle authentication
  const fetchEnvelopes = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingEnvelopes(true);
    try {
      const data = await docusignService.listEnvelopes();
      setEnvelopes(data.envelopes.map((env: any) => ({
        id: env.envelopeId,
        status: env.status,
        created: env.createdDateTime
      })));
    } catch (error) {
      console.error('Error fetching envelopes:', error);
    } finally {
      setIsLoadingEnvelopes(false);
    }
  };

  // Update handleDocusignAction to use authenticated state
  const handleDocusignAction = async () => {
    if (!selectedEnvelope || !isAuthenticated) return;

    setIsCheckingStatus(true);
    try {
      const data = await docusignService.getEnvelope(selectedEnvelope);
      setStatusResult(data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const addAsVerifiedEvent = async () => {
    if (!statusResult || !procedureId) {
      console.error('Missing required data:', { statusResult, procedureId });
      return;
    }

    console.log('Current procedureId:', procedureId);

    // Create a DocuSign event template using the API response data
    const event = {
      id: `docusign-${statusResult.envelopeId}`,
      name: "DocuSign Status Update",
      description: `DocuSign envelope ${statusResult.status}`,
      type: "DOCUSIGN_EVENT",
      procedureId,
      template: {
        source: "docusign",
        data: statusResult
      }
    };

    try {
      console.log('Creating DocuSign event:', event);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          action: 'add_template',
          procedureId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to add DocuSign event');
      }

      const result = await response.json();
      await onSave(result.event);
      setStatusResult(null);
      onClose();
    } catch (error) {
      console.error('Error adding DocuSign event:', error);
    }
  };

  // Add state handler for expanded rule debug
  const toggleRuleDebug = (ruleId: string) => {
    setExpandedRuleDebug(prev => 
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
  };

  const handleNavigatorAction = async () => {
    if (!selectedEnvelope) return;
    
    setIsLoadingAgreement(true);
    try {
      // Call the mock Navigator API endpoint
      const response = await fetch(`/api/docusign/navigator?agreementId=${selectedEnvelope}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agreement data');
      }
      
      const data = await response.json();
      setNavigatorResult(data);
    } catch (error) {
      console.error('Error calling Navigator API:', error);
    } finally {
      setIsLoadingAgreement(false);
    }
  };

  // Add handler for adding Navigator result as event
  const addNavigatorResultAsEvent = async () => {
    if (!navigatorResult) return;
    
    try {
      const event = {
        id: `evt_${Date.now()}`,
        type: 'DOCUSIGN_NAVIGATOR_GET_AGREEMENT',
        name: "DocuSign Navigator Agreement",
        description: "Agreement details from DocuSign Navigator",
        template: {
          source: "docusign-navigator",
          data: {
            accountId: '{{docusign.accountId}}',
            agreementId: selectedEnvelope,
            result: navigatorResult
          }
        }
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          action: 'add_template',
          procedureId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to add Navigator event');
      }

      const result = await response.json();
      await onSave(result.event);
      setNavigatorResult(null);
      onClose();
    } catch (error) {
      console.error('Error adding Navigator result as event:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Event for Procedure {procedureId}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="raw" onValueChange={handleTabChange}>
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
                                  {details.map((detail: any, i: number) => (
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
              {isAuthenticating ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Authenticating with DocuSign...</p>
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Not authenticated with DocuSign</p>
                  <Button onClick={() => handleTabChange('docusign')}>
                    Authenticate
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Select Envelope</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={fetchEnvelopes}
                        disabled={isLoadingEnvelopes}
                      >
                        Refresh
                      </Button>
                    </div>
                    <Select 
                      value={selectedEnvelope} 
                      onValueChange={setSelectedEnvelope}
                      disabled={isLoadingEnvelopes}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingEnvelopes ? "Loading..." : "Select envelope"} />
                      </SelectTrigger>
                      <SelectContent>
                        {envelopes.map((env: any) => (
                          <SelectItem key={env.id} value={env.id}>
                            <div className="flex flex-col">
                              <span>{env.id}</span>
                              <span className="text-xs text-muted-foreground">
                                {env.status} - {new Date(env.created || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDocusignAction}
                      disabled={!selectedEnvelope || isCheckingStatus}
                    >
                      {isCheckingStatus ? "Checking..." : "Check Status"}
                    </Button>
                    <Button 
                      onClick={handleNavigatorAction}
                      disabled={!selectedEnvelope || isLoadingAgreement}
                      variant="outline"
                    >
                      {isLoadingAgreement ? "Loading..." : "Get Agreement Insight (Navigator)"}
                    </Button>
                  </div>

                  {(statusResult || navigatorResult) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">API Result</h4>
                        <Button 
                          size="sm" 
                          onClick={statusResult ? addAsVerifiedEvent : addNavigatorResultAsEvent}
                        >
                          Add as Event
                        </Button>
                      </div>
                      <Card className="bg-muted">
                        <ScrollArea className="h-[200px] w-[500px]">
                          <pre className="p-4 text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(statusResult || navigatorResult, null, 2)}
                          </pre>
                        </ScrollArea>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add this debug section right before the Rule Matching Analysis */}
        <div className="mt-4 mb-4">
          <Button
            variant="ghost"
            className="w-full flex justify-between items-center mb-2"
            onClick={() => setShowDebug(!showDebug)}
          >
            <h3 className="text-sm font-medium">Rule Matching Debug</h3>
            {showDebug ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {showDebug && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {templateRules.map((rule: any) => {
                  try {
                    const eventObj = { 
                      type: eventType, 
                      data: JSON.parse(eventData) 
                    };
                    
                    return (
                      <Card key={rule.id} className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full flex justify-between items-center"
                          onClick={() => toggleRuleDebug(rule.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Rule: {rule.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              matchEventToRule(eventObj, { type: rule.matches.type, conditions: rule.matches.conditions }, instanceVariables)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {matchEventToRule(eventObj, { type: rule.matches.type, conditions: rule.matches.conditions }, instanceVariables) ? 'Matches' : 'No Match'}
                            </span>
                          </div>
                          {expandedRuleDebug.includes(rule.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>

                        {expandedRuleDebug.includes(rule.id) && (
                          <div className="mt-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Path</th>
                                  <th className="text-left p-2">Operator</th>
                                  <th className="text-left p-2">Expected</th>
                                  <th className="text-left p-2">Actual</th>
                                  <th className="text-left p-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(rule.matches.conditions).map(([path, pattern]: [string, any]) => {
                                  const eventValue = path.split('.')
                                    .reduce((obj: any, key: string) => obj?.[key], JSON.parse(eventData));
                                  const isContains = pattern.startsWith('(contains)');
                                  const isLlmPrompt = pattern.startsWith('(llm-prompt)');
                                  const isTemplate = pattern.includes('{{');
                                  
                                  const operator = isContains ? 'contains' : 
                                                 isLlmPrompt ? 'llm-prompt' :
                                                 isTemplate ? 'template' : 'equals';
                                                     
                                  // Get the interpolated value for templates
                                  const expectedValue = isTemplate ? 
                                    pattern.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
                                      return path.split('.')
                                        .reduce((obj: any, key: string) => obj?.[key], instanceVariables) ?? '(undefined)';
                                    }) :
                                    isContains ? pattern.replace('(contains)', '').trim() :
                                    isLlmPrompt ? pattern.replace('(llm-prompt)', '').trim() :
                                    pattern;
                                                      
                                  const matches = isTemplate ? 
                                    eventValue === expectedValue :
                                    isContains ? 
                                      String(eventValue).toLowerCase().includes(expectedValue.toLowerCase()) :
                                    isLlmPrompt ? true :
                                    eventValue === pattern;

                                  return (
                                    <tr key={path} className="border-b">
                                      <td className="p-2">{path}</td>
                                      <td className="p-2">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                          {operator}
                                        </span>
                                      </td>
                                      <td className="p-2 font-mono group relative">
                                        {expectedValue}
                                        {isTemplate && (
                                          <span className="hidden group-hover:block absolute left-0 -top-8 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                            Template: {pattern}
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2 font-mono">{String(eventValue)}</td>
                                      <td className="p-2">
                                        <span className={`px-2 py-0.5 rounded-full ${
                                          matches ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {matches ? '✓' : '✗'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </Card>
                    );
                  } catch (error) {
                    return null;
                  }
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 