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
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectModal } from "@rainbow-me/rainbowkit";

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

// Update type definitions for procedure data
interface ProcedureData {
  currentState?: string;
  template?: {
    stateMachine?: {
      fsl: string;
    };
  };
}

const fetchProcedureState = async (procedureId: string) => {
  try {
    const data = await getProcedureData(procedureId) as ProcedureData;
    
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

// Update the type definition
type Envelope = {
  envelopeId: string;
  emailSubject: string;
  sentDateTime: string;
  status: string;
}

export const CreateEventModal = ({ open, onClose, onSave }: CreateEventModalProps) => {
  // Get procedureId from URL
  const pathname = usePathname();
  const procedureId = pathname?.split('/').pop()?.split('?')[0]; // This will get 'proc_123' from the URL

  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedEnvelope, setSelectedEnvelope] = useState<string>("");
  
  // Raw event form state
  const [eventType, setEventType] = useState<string>("");
  const [eventData, setEventData] = useState<string>("");

  // Add state for rule matching
  const [matchingRules, setMatchingRules] = useState<any[]>([]);
  const [nonMatchingRules, setNonMatchingRules] = useState<any[]>([]);

  // Add state for expanded rules
  const [expandedRules, setExpandedRules] = useState<string[]>([]);

  // Add state for DocuSign data
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [isLoadingEnvelopes, setIsLoadingEnvelopes] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // DocuSign authentication states
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

  // Add state for Navigator
  const [navigatorAgreements, setNavigatorAgreements] = useState<Array<any>>([]);
  const [selectedNavigatorAgreement, setSelectedNavigatorAgreement] = useState<string>("");
  const [isLoadingNavigator, setIsLoadingNavigator] = useState(false);

  // Add state for Click API
  const [clickwraps, setClickwraps] = useState<Array<any>>([]);
  const [selectedClickwrap, setSelectedClickwrap] = useState<string>("");
  const [isLoadingClickwraps, setIsLoadingClickwraps] = useState(false);
  const [isLoadingClickwrapStatus, setIsLoadingClickwrapStatus] = useState(false);
  const [clickwrapResult, setClickwrapResult] = useState<any>(null);

  // Update Web3 state to use scaffold-eth hooks
  const [messageToSign, setMessageToSign] = useState<string>("");
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();

  // Replace single currentRuleCheckData with section-specific ones
  const [envelopeRuleCheckData, setEnvelopeRuleCheckData] = useState<any>(null);
  const [navigatorRuleCheckData, setNavigatorRuleCheckData] = useState<any>(null);
  const [clickwrapRuleCheckData, setClickwrapRuleCheckData] = useState<any>(null);
  const [web3RuleCheckData, setWeb3RuleCheckData] = useState<any>(null);

  // Add new state for users consent
  const [clickwrapUsers, setClickwrapUsers] = useState<any>(null);

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

  // Add effects to watch all response states
  useEffect(() => {
    if (statusResult) {
      checkRuleMatching({
        type: "DOCUSIGN_EVENT",
        data: statusResult
      });
    }
  }, [statusResult]);

  useEffect(() => {
    if (navigatorResult) {
      checkRuleMatching({
        type: "DOCUSIGN_NAVIGATOR_GET_AGREEMENT",
        data: navigatorResult
      });
    }
  }, [navigatorResult]);

  useEffect(() => {
    if (clickwrapResult) {
      checkRuleMatching({
        type: "DOCUSIGN_CLICK_STATUS",
        data: clickwrapResult
      });
    }
  }, [clickwrapResult]);

  useEffect(() => {
    if (signedMessage && messageToSign) {
      checkRuleMatching({
        type: "WEB3_SIGNED_MESSAGE",
        data: {
          message: messageToSign,
          signature: signedMessage,
          signer: address
        }
      });
    }
  }, [signedMessage, messageToSign, address]);

  // Update checkRuleMatching to take type as parameter
  const checkRuleMatching = async (event: { type: string, data: any }) => {
    try {
      const matching = [];
      const nonMatching = [];

      for (const rule of templateRules) {
        if (rule.matches.type === event.type) {
          try {
            const matches = await matchEventToRule(
              event,
              { type: rule.matches.type, conditions: rule.matches.conditions },
              instanceVariables
            );

            if (matches) {
              matching.push(rule);
            } else {
              // Add detailed condition comparison with interpolated values
              const conditionDetails = Object.entries(rule.matches.conditions || {}).map(([field, condition]: [string, any]) => {
                const actualValue = field.split('.').reduce((obj, key) => obj?.[key], event.data);
                const expectedTemplate = condition.toString();
                const interpolated = expectedTemplate.replace(/\{\{([^}]+)\}\}/g, (match: string, path: string) => {
                  return path.split('.')
                    .reduce((obj: any, key: string) => obj?.[key], instanceVariables) || match;
                });

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
              actual: event.type,
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

  // Update the raw event effect to use new format
  useEffect(() => {
    try {
      const parsedData = JSON.parse(eventData);
      checkRuleMatching({
        type: eventType,
        data: parsedData
      });
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
      const eventTemplate = {
        id: `email_received_${Date.now()}`,
        name: `${eventType} Event`,
        description: `${eventType} event created manually`,
        type: eventType,
        template: {
          source: "manual",
          data: parsedData
        }
      };

      // Let parent handle the API call
      await onSave(eventTemplate);
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

  // Update handleTabChange to handle separate auth flows correctly
  const handleTabChange = async (tab: string) => {
    if (tab === 'docusign') {
      setIsAuthenticating(true);
      try {
        // Try to use stored auth first
        const storedAuth = localStorage.getItem('navigatorAuth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          console.log('Using stored auth:', {
            baseUrl: authData.baseUrl,
            accountId: authData.accountId,
            tokenStart: authData.accessToken.substring(0, 20) + '...'
          });

          // Test the stored auth
          let authResponse = await fetch('/api/docusign/navigator/proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: `${authData.baseUrl}/accounts/${authData.accountId}/agreements`,
              token: authData.accessToken
            })
          });

          const data = await authResponse.json();

          // If we need new consent, clear stored auth and redirect
          if (authResponse.status === 401 && data.needsConsent) {
            console.log('Need new consent, clearing stored auth...');
            localStorage.removeItem('navigatorAuth');
            localStorage.removeItem('navigatorConsent');
            
            // Redirect to get fresh auth
            authResponse = await fetch('/api/docusign/navigator?useMock=false', {
              method: 'POST'
            });
            const freshData = await authResponse.json();
            
            if (freshData.consentUrl) {
              window.location.href = freshData.consentUrl;
              return;
            }
          }

          // If auth is valid, fetch data
          if (authResponse.ok) {
            await fetchEnvelopes();
            await fetchNavigatorAgreements();
            await fetchClickwraps();
            return;
          }
        }

        // No stored auth or invalid auth, get fresh auth
        const response = await fetch('/api/docusign/navigator?useMock=false', {
          method: 'POST'
        });
        const data = await response.json();
        
        if (data.consentUrl) {
          window.location.href = data.consentUrl;
          return;
        }

      } catch (error) {
        console.error('Authentication failed:', error);
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

  // Update fetchEnvelopes to use the correct endpoint
  const fetchEnvelopes = async () => {
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (!storedAuth) return;
    
    setIsLoadingEnvelopes(true);
    try {
      const authData = JSON.parse(storedAuth);
      const response = await fetch('/api/docusign/envelopes', {
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`,
          'Account-Id': authData.accountId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch envelopes');
      }

      const data = await response.json();
      console.log('Envelopes response:', data);
      setEnvelopes(data.envelopes.map((env: any) => ({
        envelopeId: env.envelopeId,
        emailSubject: env.emailSubject,
        sentDateTime: env.sentDateTime,
        status: env.status
      })));
    } catch (error) {
      console.error('Error fetching envelopes:', error);
    } finally {
      setIsLoadingEnvelopes(false);
    }
  };

  // Update handleDocusignAction for envelopes to use specific endpoint
  const handleDocusignAction = async () => {
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (!selectedEnvelope || !storedAuth) return;

    setIsCheckingStatus(true);
    try {
      const authData = JSON.parse(storedAuth);
      const response = await fetch(`/api/docusign/envelopes/${selectedEnvelope}`, {
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`,
          'Account-Id': authData.accountId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get envelope status');
      }
      const data = await response.json();
      setStatusResult(data);
    } catch (error) {
      console.error('Error checking envelope status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const addAsVerifiedEvent = async () => {
    if (!statusResult || !procedureId) return;
    
    try {
      const eventData = {
        type: "DOCUSIGN_STATUS",
        name: "DocuSign Status Event",
        description: "DocuSign envelope status check",
        template: {
          source: "manual",
          data: statusResult
        }
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  // Add state handler for expanded rule debug
  const toggleRuleDebug = (ruleId: string) => {
    setExpandedRuleDebug(prev => 
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
  };

  // Update handleNavigatorAction for agreements to use specific endpoint
  const handleNavigatorAction = async (agreementId: string) => {
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (!storedAuth) return;

    setIsLoadingAgreement(true);
    try {
      const authData = JSON.parse(storedAuth);
      const endpoint = `${authData.baseUrl}/accounts/${authData.accountId}/agreements/${agreementId}`;

      const response = await fetch('/api/docusign/navigator/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: endpoint,
          method: 'GET',
          token: authData.accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get agreement details');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      console.log('Agreement response:', data);
      setNavigatorResult({
        id: data.id,
        name: data.name,
        fileName: data.file_name,
        type: data.type,
        category: data.category,
        status: data.status,
        created: data.created_date ? new Date(data.created_date).toLocaleString() : 'N/A',
        modified: data.last_modified_date ? new Date(data.last_modified_date).toLocaleString() : 'N/A',
        rawData: data
      });
    } catch (error) {
      console.error('Error getting agreement details:', error);
    } finally {
      setIsLoadingAgreement(false);
    }
  };

  // Update fetchNavigatorAgreements to match playground formatting
  const fetchNavigatorAgreements = async () => {
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (!storedAuth) return;
    
    setIsLoadingNavigator(true);
    try {
      const authData = JSON.parse(storedAuth);
      const response = await fetch('/api/docusign/navigator/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: `${authData.baseUrl}/accounts/${authData.accountId}/agreements`,
          token: authData.accessToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Navigator agreements');
      }

      const responseData = await response.json();
      console.log('Raw Navigator response:', responseData);
      
      // Use agreements from the top level instead of data
      const agreements = responseData.agreements || [];
      console.log('Agreements to display:', agreements);
      
      setNavigatorAgreements(agreements);
    } catch (error) {
      console.error('Error fetching Navigator agreements:', error);
    } finally {
      setIsLoadingNavigator(false);
    }
  };

  // Update fetchClickwraps to use the correct endpoint
  const fetchClickwraps = async () => {
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (!storedAuth) return;
    
    setIsLoadingClickwraps(true);
    try {
      const authData = JSON.parse(storedAuth);
      const response = await fetch('/api/docusign/click/clickwraps', {
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`,
          'Account-Id': authData.accountId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list clickwraps');
      }

      const data = await response.json();
      console.log('Clickwraps response:', data);
      setClickwraps(data.clickwraps.map((cw: any) => ({
        clickwrapId: cw.clickwrapId,
        clickwrapName: cw.clickwrapName,
        versionNumber: cw.versionNumber,
        status: cw.status,
        accountId: cw.accountId,
        createdTime: cw.createdTime
      })));
    } catch (error) {
      console.error('Error fetching clickwraps:', error);
    } finally {
      setIsLoadingClickwraps(false);
    }
  };

  // Update handleClickwrapAction for clickwraps to use specific endpoint
  const handleClickwrapAction = async () => {
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (!selectedClickwrap || !storedAuth) return;
    
    setIsLoadingClickwrapStatus(true);
    try {
      const authData = JSON.parse(storedAuth);
      const response = await fetch(`/api/docusign/click/clickwraps/${selectedClickwrap}`, {
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`,
          'Account-Id': authData.accountId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get clickwrap status');
      }
      const data = await response.json();
      setClickwrapResult(data);
    } catch (error) {
      console.error('Error getting clickwrap status:', error);
    } finally {
      setIsLoadingClickwrapStatus(false);
    }
  };

  const addClickwrapResultAsEvent = async () => {
    if (!clickwrapResult) return;
    
    try {
      const event = {
        id: `click_${Date.now()}`,
        type: 'DOCUSIGN_CLICK_STATUS',
        name: "DocuSign Click Status",
        description: "Clickwrap status from DocuSign Click API",
        template: {
          source: "docusign-click",
          data: clickwrapResult
        }
      };

      // Let parent handle the API call
      await onSave(event);
      onClose();
      setClickwrapResult(null);
    } catch (error) {
      console.error('Error adding Click result as event:', error);
    }
  };

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
            agreementId: selectedNavigatorAgreement,
            result: navigatorResult
          }
        }
      };

      // Let parent handle the API call
      await onSave(event);
      onClose();
      setNavigatorResult(null);
    } catch (error) {
      console.error('Error adding Navigator result as event:', error);
    }
  };

  // Add Web3 signing handler
  const handleSignMessage = async () => {
    try {
      if (!messageToSign) return;
      const signature = await signMessageAsync({ message: messageToSign });
      setSignedMessage(signature);
    } catch (error) {
      console.error('Error signing message:', error);
    }
  };

  // Add Web3 event creation handler
  const addSignedMessageAsEvent = async () => {
    if (!signedMessage || !messageToSign) return;
    
    try {
      const event = {
        id: `web3_${Date.now()}`,
        type: 'WEB3_SIGNED_MESSAGE',
        name: "Web3 Signed Message",
        description: "Message signed with Web3 wallet",
        template: {
          source: "web3",
          data: {
            message: messageToSign,
            signature: signedMessage,
            signer: address
          }
        }
      };

      await onSave(event);
      onClose();
      setSignedMessage(null);
      setMessageToSign("");
    } catch (error) {
      console.error('Error adding Web3 event:', error);
    }
  };

  // Add type annotations for handleFileChange
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, filePath: string): void => {
    // ... existing code ...
  };

  // Add type annotations for handleConditionChange
  const handleConditionChange = (_: React.ChangeEvent<HTMLInputElement>, path: string): void => {
    // ... existing code ...
  };

  // Add type annotations for pattern replace callback
  const handlePatternReplace = (match: string, path: string): string => {
    return path.split('.')
      .reduce((obj: any, key: string) => obj?.[key], instanceVariables) ?? '(undefined)';
  };

  // Update the checkRulesAgainstData function to take a setter
  const checkRulesAgainstData = async (data: any, eventType: string, setRuleCheckData: any) => {
    try {
      const event = {
        type: "DOCUSIGN_STATUS",
        data: data,
        template: {
          source: "manual",
          data: data
        }
      };
      const matching = [];
      const nonMatching = [];

      for (const rule of templateRules) {
        if (rule.matches.type === eventType) {
          try {
            const matches = await matchEventToRule(
              event,
              { type: rule.matches.type, conditions: rule.matches.conditions },
              instanceVariables
            );

            if (matches) {
              matching.push(rule);
            } else {
              const conditionDetails = Object.entries(rule.matches.conditions || {}).map(([field, condition]: [string, any]) => {
                const actualValue = field.split('.').reduce((obj, key) => obj?.[key], data);
                const expectedTemplate = condition.toString();
                const interpolated = expectedTemplate.replace(/\{\{([^}]+)\}\}/g, (match: string, path: string) => {
                  return path.split('.')
                    .reduce((obj: any, key: string) => obj?.[key], instanceVariables) || match;
                });

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

      setRuleCheckData({ matching, nonMatching });
    } catch (error) {
      console.error("Error in checkRulesAgainstData:", error);
      setRuleCheckData(null);
    }
  };

  // Add RuleMatchingDisplay component
  const RuleMatchingDisplay = ({ data }: { data: { matching: any[], nonMatching: any[] } }) => (
    <div className="mt-4 space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium">Rule Matching Results</h4>
      
      {data.matching.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-green-600">Matching Rules:</h5>
          <div className="space-y-1">
            {data.matching.map(rule => (
              <div key={rule.id} className="text-xs bg-green-50 text-green-700 p-2 rounded">
                {rule.id}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.nonMatching.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-yellow-600">Non-Matching Rules:</h5>
          <div className="space-y-1">
            {data.nonMatching.map(({ rule, reason, details }) => (
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
    </div>
  );

  // Clear rule check data when closing modal
  useEffect(() => {
    if (!open) {
      setEnvelopeRuleCheckData(null);
      setNavigatorRuleCheckData(null);
      setClickwrapRuleCheckData(null);
      setWeb3RuleCheckData(null);
    }
  }, [open]);

  // Update the checkClickwrapUsers function to use the existing endpoint
  const checkClickwrapUsers = async () => {
    try {
      const storedAuth = localStorage.getItem('navigatorAuth');
      if (!storedAuth) return;
      const authData = JSON.parse(storedAuth);

      const response = await fetch(`/api/docusign/click/clickwraps/${selectedClickwrap}/agreements`, {
        method: 'POST',  // Using POST to get users list as per the existing endpoint
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`,
          'Account-Id': authData.accountId
        }
      });

      if (!response.ok) throw new Error('Failed to get users');
      const data = await response.json();
      setClickwrapUsers(data);
    } catch (error) {
      console.error('Error checking users:', error);
    }
  };

  // Add new function to add users consent as event
  const addUsersConsentAsEvent = async () => {
    try {
      const eventData = {
        type: "DOCUSIGN_CLICK_USERS",
        name: "DocuSign Click Users Consent",
        description: "DocuSign clickwrap users consent check",
        template: {
          source: "manual",
          data: clickwrapUsers
        }
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error adding event:', error);
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
            <TabsTrigger value="web3">Web3 Sign</TabsTrigger>
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
              ) : !localStorage.getItem('navigatorAuth') ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Not authenticated with DocuSign</p>
                  <Button onClick={() => handleTabChange('docusign')}>
                    Authenticate
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Envelopes Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Envelope Status</h4>
                    <Card className="p-4">
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
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select envelope" />
                          </SelectTrigger>
                          <SelectContent>
                            {envelopes
                              .sort((a, b) => {
                                // Handle undefined sentDateTime with empty string fallback
                                const dateA = a.sentDateTime || '';
                                const dateB = b.sentDateTime || '';
                                return dateB.localeCompare(dateA);
                              })
                              .map((envelope) => (
                                <SelectItem key={envelope.envelopeId} value={envelope.envelopeId}>
                                  <div className="flex flex-col">
                                    <span>{envelope.envelopeId}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {envelope.sentDateTime || 'No date'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <Button 
                          onClick={handleDocusignAction}
                          disabled={!selectedEnvelope || isCheckingStatus}
                          className="w-full"
                        >
                          {isCheckingStatus ? "Checking..." : "Check Status"}
                        </Button>
                      </div>

                      {statusResult && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Envelope Status</h4>
                            <div className="space-x-2">
                              <Button 
                                size="sm"
                                variant="outline" 
                                onClick={() => checkRulesAgainstData(statusResult, "DOCUSIGN_STATUS", setEnvelopeRuleCheckData)}
                              >
                                Check Rules
                              </Button>
                              <Button size="sm" onClick={addAsVerifiedEvent}>
                                Add as Event
                              </Button>
                            </div>
                          </div>

                          {/* Source Badge */}
                          <div className="flex items-center">
                            <span className="text-xs font-medium mr-2">Source:</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              {selectedEndpoint === 'docusign' ? 'docusign' : 'manual'}
                            </span>
                          </div>

                          {/* Event Data */}
                          <div>
                            <span className="text-xs font-medium">Data:</span>
                            <Card className="bg-muted mt-1">
                              <ScrollArea className="h-[200px]">
                                <div className="p-4 w-[500px]">
                                  <pre className="text-xs whitespace-pre-wrap font-mono">
                                    {JSON.stringify(statusResult, null, 2)}
                                  </pre>
                                </div>
                              </ScrollArea>
                            </Card>
                          </div>

                          {envelopeRuleCheckData && <RuleMatchingDisplay data={envelopeRuleCheckData} />}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Navigator Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Navigator Agreements</h4>
                    <Card className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Select Agreement</Label>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={fetchNavigatorAgreements}
                            disabled={isLoadingNavigator}
                          >
                            Refresh
                          </Button>
                        </div>
                        <Select 
                          value={selectedNavigatorAgreement} 
                          onValueChange={setSelectedNavigatorAgreement}
                          disabled={isLoadingNavigator}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingNavigator ? "Loading..." : "Select agreement"} />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[200px]">
                              {navigatorAgreements.map((agreement) => (
                                <SelectItem 
                                  key={agreement.id} 
                                  value={agreement.id}
                                  className="flex flex-col py-2 cursor-pointer"
                                >
                                  <span className="font-medium">{agreement.fileName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Status: {agreement.status}
                                  </span>
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>

                        <Button 
                          onClick={() => handleNavigatorAction(selectedNavigatorAgreement)}
                          disabled={!selectedNavigatorAgreement || isLoadingAgreement}
                          className="w-full mt-2"
                        >
                          {isLoadingAgreement ? "Loading..." : "Get Agreement Details"}
                        </Button>

                        {navigatorResult && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Agreement Details</h4>
                              <div className="space-x-2">
                                <Button 
                                  size="sm"
                                  variant="outline" 
                                  onClick={() => checkRulesAgainstData(navigatorResult, "DOCUSIGN_NAVIGATOR_GET_AGREEMENT", setNavigatorRuleCheckData)}
                                >
                                  Check Rules
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={async () => {
                                    try {
                                      await addNavigatorResultAsEvent();
                                    } catch (error) {
                                      console.error('Error adding event:', error);
                                    }
                                  }}
                                >
                                  Add as Event
                                </Button>
                              </div>
                            </div>
                            {navigatorRuleCheckData && <RuleMatchingDisplay data={navigatorRuleCheckData} />}
                            <Card className="bg-muted">
                              <ScrollArea className="h-[200px]">
                                <div className="p-4">
                                  <pre className="text-xs whitespace-pre-wrap font-mono max-w-full overflow-x-auto">
                                    {JSON.stringify(navigatorResult, null, 2)}
                                  </pre>
                                </div>
                              </ScrollArea>
                            </Card>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Click API Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Click API Agreements</h4>
                    <Card className="p-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Select Clickwrap</Label>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={fetchClickwraps}
                              disabled={isLoadingClickwraps}
                            >
                              Refresh
                            </Button>
                          </div>

                          <Select
                            value={selectedClickwrap}
                            onValueChange={setSelectedClickwrap}
                            disabled={isLoadingClickwraps}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={isLoadingClickwraps ? "Loading..." : "Select clickwrap"} />
                            </SelectTrigger>
                            <SelectContent>
                              <ScrollArea className="h-[200px]">
                                {clickwraps.map((clickwrap: any) => (
                                  <SelectItem 
                                    key={clickwrap.clickwrapId} 
                                    value={clickwrap.clickwrapId}
                                  >
                                    <div className="flex flex-col py-1">
                                      <span className="font-medium text-sm">{clickwrap.clickwrapName || 'Untitled Clickwrap'}</span>
                                      <span className="text-xs text-muted-foreground mt-0.5">
                                        Version: {clickwrap.versionNumber || '1'} - Status: {clickwrap.status || 'Unknown'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>

                          <Button 
                            onClick={handleClickwrapAction}
                            disabled={!selectedClickwrap || isLoadingClickwrapStatus}
                            className="w-full mt-2"
                          >
                            {isLoadingClickwrapStatus ? "Loading..." : "Check Consent Status"}
                          </Button>

                          {clickwrapResult && (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Clickwrap Status</h4>
                                <div className="space-x-2">
                                  <Button 
                                    size="sm"
                                    variant="outline" 
                                    onClick={() => checkRulesAgainstData(clickwrapResult, "DOCUSIGN_CLICK_STATUS", setClickwrapRuleCheckData)}
                                  >
                                    Check Rules
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={async () => {
                                      try {
                                        await addClickwrapResultAsEvent();
                                      } catch (error) {
                                        console.error('Error adding event:', error);
                                      }
                                    }}
                                  >
                                    Add as Event
                                  </Button>
                                </div>
                              </div>
                              {clickwrapRuleCheckData && <RuleMatchingDisplay data={clickwrapRuleCheckData} />}
                              <Card className="bg-muted">
                                <ScrollArea className="h-[200px]">
                                  <div className="p-4">
                                    <pre className="text-xs whitespace-pre-wrap font-mono max-w-full overflow-x-auto">
                                      {JSON.stringify(clickwrapResult, null, 2)}
                                    </pre>
                                  </div>
                                </ScrollArea>
                              </Card>
                            </div>
                          )}
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Users Consent</h4>
                            <div className="space-x-2">
                              <Button 
                                size="sm"
                                variant="outline" 
                                onClick={checkClickwrapUsers}
                                disabled={!selectedClickwrap}
                              >
                                Check Users
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={addUsersConsentAsEvent}
                                disabled={!clickwrapUsers}
                              >
                                Add as Event
                              </Button>
                            </div>
                          </div>

                          {clickwrapUsers && (
                            <div className="mt-4">
                              <Card className="bg-muted">
                                <ScrollArea className="h-[200px]">
                                  <div className="p-4">
                                    <pre className="text-xs whitespace-pre-wrap font-mono max-w-full overflow-x-auto">
                                      {JSON.stringify(clickwrapUsers, null, 2)}
                                    </pre>
                                  </div>
                                </ScrollArea>
                              </Card>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="web3">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">Sign Message with Web3</h3>
              <div className="space-y-4">
                {!isConnected ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Connect your wallet to sign messages</p>
                    <Button onClick={openConnectModal}>
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Message to Sign</Label>
                      <Textarea
                        value={messageToSign}
                        onChange={(e) => setMessageToSign(e.target.value)}
                        placeholder="Enter a message to sign..."
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleSignMessage}
                      disabled={!messageToSign}
                      className="w-full"
                    >
                      Sign Message
                    </Button>

                    {signedMessage && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Signature</h4>
                          <div className="space-x-2">
                            <Button 
                              size="sm"
                              variant="outline" 
                              onClick={() => checkRulesAgainstData({
                                message: messageToSign,
                                signature: signedMessage,
                                signer: address
                              }, "WEB3_SIGNED_MESSAGE", setWeb3RuleCheckData)}
                            >
                              Check Rules
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={addSignedMessageAsEvent}
                            >
                              Add as Event
                            </Button>
                          </div>
                        </div>
                        {web3RuleCheckData && <RuleMatchingDisplay data={web3RuleCheckData} />}
                        <Card className="bg-muted">
                          <ScrollArea className="h-[200px]">
                            <div className="p-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm font-medium">Message:</span>
                                  <pre className="text-xs mt-1 bg-slate-100 p-2 rounded max-w-full overflow-x-auto">{messageToSign}</pre>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Signature:</span>
                                  <pre className="text-xs mt-1 bg-slate-100 p-2 rounded max-w-full overflow-x-auto whitespace-pre-wrap break-all">{signedMessage}</pre>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Signer:</span>
                                  <pre className="text-xs mt-1 bg-slate-100 p-2 rounded max-w-full overflow-x-auto">{address}</pre>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        </Card>
                      </div>
                    )}
                  </>
                )}
              </div>
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
                {templateRules.map(async (rule: any) => {
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
                              await matchEventToRule(eventObj, { type: rule.matches.type, conditions: rule.matches.conditions }, instanceVariables)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {await matchEventToRule(eventObj, { type: rule.matches.type, conditions: rule.matches.conditions }, instanceVariables) ? 'Matches' : 'No Match'}
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
                                    pattern.replace(/\{\{([^}]+)\}\}/g, handlePatternReplace) :
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