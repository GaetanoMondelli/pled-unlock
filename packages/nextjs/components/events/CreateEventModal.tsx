"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { EventTemplate } from "../../types/events";
import { matchEventToRule } from "../../utils/eventMatching";
import pledData from "@/public/pled.json";

const EVENT_TEMPLATES = {
  EMAIL_RECEIVED: {
    source: "gmail",
    data: {
      from: "john@example.com",
      to: "hr@company.com",
      subject: "Interview request",
      body: "I would like to schedule an interview",
      time: "2024-01-17T10:00:00Z"
    }
  },
  CALENDAR_EVENT: {
    source: "google-calendar",
    data: {
      type: "schedule_interview",
      candidateEmail: "john@example.com",
      interviewerEmail: "hr@company.com",
      proposedTime: "2024-01-20T10:00:00Z",
      duration: "60"
    }
  },
  INTERVIEW_EVENT: {
    source: "interview-system",
    data: {
      type: "interview_completed",
      candidateId: "CAND-123",
      interviewerId: "INT-456",
      duration: "55",
      completedAt: "2024-01-20T11:00:00Z"
    }
  },
  FEEDBACK_EVENT: {
    source: "feedback-system",
    data: {
      type: "interview_feedback",
      candidateId: "CAND-123",
      decision: "positive",
      rating: 4.5,
      notes: "Strong technical skills and good culture fit",
      recommendedAction: "proceed_to_offer"
    }
  },
  HR_EVENT: {
    source: "hr-system",
    data: {
      action: "approve_candidate",
      decision: "approved",
      candidateId: "CAND-123",
      approver: "hr@company.com"
    }
  },
  CONTRACT_EVENT: {
    source: "contract-service",
    data: {
      status: "generated",
      templateId: "EMP-001",
      documentId: "DOC-456",
      metadata: {
        candidateName: "John Doe",
        position: "Software Engineer",
        department: "Engineering"
      }
    }
  },
  DOCUSIGN_EVENT: {
    source: "docusign",
    data: {
      envelopeStatus: "sent",
      envelopeId: "ENV-789",
      recipientStatus: ["sent"],
      recipients: [{
        email: "john@example.com",
        status: "sent",
        sentAt: "2024-01-17T10:10:00Z"
      }]
    }
  }
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (template: EventTemplate) => void;
}

interface RuleMatchResult {
  rule: any;
  matches: boolean;
  reasons?: string[];
}

export const CreateEventModal = ({ open, onClose, onSave }: Props) => {
  const [hasEdited, setHasEdited] = useState(false);
  const [template, setTemplate] = useState<Partial<EventTemplate>>({
    type: 'EMAIL_RECEIVED',
    template: {
      source: "gmail",
      data: {
        from: "",
        to: "",
        subject: "",
        body: "",
        time: new Date().toISOString()
      }
    }
  });
  const [ruleMatches, setRuleMatches] = useState<RuleMatchResult[]>([]);

  // Check rules when component mounts and when template changes
  useEffect(() => {
    checkMatchingRules(template);
  }, [template]);

  // Only update template when type changes AND user hasn't edited
  useEffect(() => {
    if (template.type && !hasEdited) {
      const newTemplate = {
        ...template,
        template: EVENT_TEMPLATES[template.type as keyof typeof EVENT_TEMPLATES]
      };
      setTemplate(newTemplate);
      // No need to call checkMatchingRules here as it will be triggered by the template change
    }
  }, [template.type, hasEdited]);

  // Reset edited state when type changes
  const handleTypeChange = (value: string) => {
    setHasEdited(false);
    setTemplate({ ...template, type: value });
  };

  const handleDataChange = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      setHasEdited(true);
      setTemplate(prev => ({
        ...prev,
        template: {
          ...prev.template!,
          data
        }
      }));
      // No need to call checkMatchingRules here as it will be triggered by the template change
    } catch (error) {
      // Handle invalid JSON
    }
  };

  const checkMatchingRules = (currentTemplate: Partial<EventTemplate>) => {
    const procedureTemplate = pledData.procedureTemplates.find(
      t => t.templateId === "hiring_process"
    );

    // Get the instance variables for comparison
    const instance = pledData.procedureInstances[0];
    const variables = instance?.variables || {};

    if (!procedureTemplate || !currentTemplate.type || !currentTemplate.template?.data) {
      setRuleMatches([]);
      return;
    }

    const mockEvent = {
      type: currentTemplate.type,
      data: currentTemplate.template.data
    };

    const results = procedureTemplate.messageRules.map(rule => {
      const reasons: string[] = [];
      
      // Check event type
      if (mockEvent.type !== rule.matches.type) {
        reasons.push(`Event type "${mockEvent.type}" doesn't match rule type "${rule.matches.type}"`);
      }

      // Check conditions with detailed feedback
      Object.entries(rule.matches.conditions).forEach(([path, pattern]) => {
        const value = getValueByPath(mockEvent.data, path);
        
        if (typeof pattern === 'string') {
          if (pattern.startsWith('(contains)')) {
            const searchTerm = pattern.replace('(contains)', '').trim();
            if (!String(value).toLowerCase().includes(searchTerm.toLowerCase())) {
              reasons.push(`Field "${path}" value "${value}" doesn't contain "${searchTerm}"`);
            }
          } else if (pattern.includes('{{')) {
            const varPath = pattern.replace('{{', '').replace('}}', '').trim();
            const expectedValue = getValueByPath(variables, varPath);
            
            // If it starts with 'event.data', it's an output capture
            if (varPath.startsWith('event.data')) {
              reasons.push(
                `Output capture for "${pattern}":` +
                `\n  - Path: ${path}` +
                `\n  - Value to store: ${value}`
              );
            } else {
              // It's a variable match
              if (String(value) !== String(expectedValue)) {
                reasons.push(
                  `Variable substitution needed for "${pattern}":` +
                  `\n  - Path: ${path}` +
                  `\n  - Expected: ${expectedValue}` +
                  `\n  - Current: ${value}` +
                  `\n  - Match: ${String(value) === String(expectedValue)}`
                );
              }
            }
          } else if (value !== pattern) {
            reasons.push(`Field "${path}" value "${value}" doesn't match "${pattern}"`);
          }
        }
      });

      return {
        rule,
        matches: reasons.length === 0,
        reasons: reasons.length > 0 ? reasons : undefined
      };
    });

    setRuleMatches(results);
  };

  const handleSave = () => {
    if (template.name && template.type) {
      onSave({
        id: `template-${Date.now()}`,
        name: template.name,
        description: template.description || '',
        type: template.type,
        template: template.template || EVENT_TEMPLATES[template.type as keyof typeof EVENT_TEMPLATES]
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Event Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={template.name || ''}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="Event template name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              placeholder="Describe the event template"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select
              value={template.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL_RECEIVED">Email Received</SelectItem>
                <SelectItem value="CALENDAR_EVENT">Calendar Event</SelectItem>
                <SelectItem value="INTERVIEW_EVENT">Interview Event</SelectItem>
                <SelectItem value="FEEDBACK_EVENT">Feedback Event</SelectItem>
                <SelectItem value="HR_EVENT">HR Event</SelectItem>
                <SelectItem value="CONTRACT_EVENT">Contract Event</SelectItem>
                <SelectItem value="DOCUSIGN_EVENT">DocuSign Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Event Data</label>
            <div className="mt-1 font-mono">
              <Textarea
                value={JSON.stringify(template.template?.data || {}, null, 2)}
                onChange={(e) => handleDataChange(e.target.value)}
                className="font-mono text-sm"
                rows={12}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Matching Rules</label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-[200px] overflow-y-auto">
              {ruleMatches.length > 0 ? (
                <div className="space-y-2">
                  {ruleMatches.map(({ rule, matches, reasons }) => (
                    <div 
                      key={rule.id} 
                      className={`p-2 rounded border ${
                        matches ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          matches 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.id}
                        </span>
                        <span className="text-sm text-gray-500">
                          Priority: {rule.priority}
                        </span>
                        {matches && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Matches!
                          </span>
                        )}
                      </div>
                      {rule.generates && matches && (
                        <div className="mt-1 text-xs text-gray-600">
                          Generates: {rule.generates.type}
                        </div>
                      )}
                      {!matches && reasons && (
                        <div className="mt-2 text-xs text-red-600 space-y-2">
                          {reasons.map((reason, i) => (
                            <div key={i} className="whitespace-pre-wrap">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  No rules to match against
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Create Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function from eventMatching.ts
function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
} 