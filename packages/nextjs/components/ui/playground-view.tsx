"use client"

import { useState, useEffect } from "react"
import { Card } from "./card"
import { ScrollArea } from "./scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Button } from "./button"
import { Input } from "./input"
import { Textarea } from "./textarea"
import {
  Send,
  FileSignature,
  Download,
  Upload,
  List,
  Eye,
  EyeOff,
  LogOut
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"

interface DocuSignConfig {
  integrationKey: string;
  accountId: string;
  userId: string;
  privateKey: string;
  oAuthServer: string;
}

interface TabPosition {
  pageNumber: string;
  xPosition: string;
  yPosition: string;
  name: string;
  tabLabel: string;
}

interface EnvelopeStatus {
  [key: string]: {
    emoji: string;
    title: string;
    description: string;
  };
}

const ENVELOPE_STATUSES: EnvelopeStatus = {
  created: {
    emoji: "📝",
    title: "Created",
    description: "The envelope has been created and saved as a draft. Recipients have not been notified yet."
  },
  sent: {
    emoji: "📤",
    title: "Sent",
    description: "The envelope has been sent to recipients. They will receive email notifications to sign."
  },
  delivered: {
    emoji: "📨",
    title: "Delivered",
    description: "Recipients have received the envelope and can now view and sign the documents."
  },
  completed: {
    emoji: "✅",
    title: "Completed",
    description: "All recipients have signed the document and the process is complete."
  },
  declined: {
    emoji: "❌",
    title: "Declined",
    description: "One or more recipients have declined to sign the document."
  },
  voided: {
    emoji: "🚫",
    title: "Voided",
    description: "The envelope has been voided and can no longer be acted upon."
  },
  signed: {
    emoji: "✍️",
    title: "Signed",
    description: "The document has been signed but may be waiting for additional signatures."
  },
  corrected: {
    emoji: "📝",
    title: "Corrected",
    description: "The envelope has been corrected and resent to the recipients."
  },
  processing: {
    emoji: "⚙️",
    title: "Processing",
    description: "DocuSign is processing the envelope (temporary state)."
  },
  template: {
    emoji: "📋",
    title: "Template",
    description: "The envelope is saved as a template for future use."
  },
  failed: {
    emoji: "💔",
    title: "Failed",
    description: "The envelope processing has failed. Please check for errors and try again."
  },
  contract_prepared: {
    emoji: "📋",
    title: "Contract Prepared",
    description: "Employment contract has been prepared and is ready to be sent"
  },
  contract_sent: {
    emoji: "📤",
    title: "Contract Sent",
    description: "Employment contract has been sent to the candidate"
  },
  contract_signed: {
    emoji: "✍️",
    title: "Contract Signed",
    description: "Employment contract has been signed by the candidate"
  },
  draft: {
    emoji: "📝",
    title: "Draft",
    description: "The envelope is saved as a draft and can be modified before sending"
  },
  sent_api: {
    emoji: "🔄",
    title: "Sent via API",
    description: "The envelope has been sent through the DocuSign API"
  },
  delivered_api: {
    emoji: "📨",
    title: "Delivered via API",
    description: "The envelope has been delivered through the DocuSign API"
  },
  authentication_failed: {
    emoji: "🔒",
    title: "Authentication Failed",
    description: "Recipient authentication has failed. They may need to verify their identity"
  },
  auto_responded: {
    emoji: "🤖",
    title: "Auto Responded",
    description: "An automatic response has been received for this envelope"
  },
  expired: {
    emoji: "⏰",
    title: "Expired",
    description: "The envelope has expired without being completed"
  },
  waiting_for_review: {
    emoji: "👀",
    title: "Waiting for Review",
    description: "The envelope is waiting for review before proceeding"
  },
  waiting_for_others: {
    emoji: "⏳",
    title: "Waiting for Others",
    description: "Waiting for other recipients to complete their actions"
  },
  out_for_signature: {
    emoji: "✒️",
    title: "Out for Signature",
    description: "The envelope has been sent and is awaiting signatures"
  },
  viewed: {
    emoji: "👁️",
    title: "Viewed",
    description: "The envelope has been viewed by the recipient but not yet signed"
  },
  partially_signed: {
    emoji: "📑",
    title: "Partially Signed",
    description: "Some but not all recipients have signed the document"
  },
  in_progress: {
    emoji: "🔄",
    title: "In Progress",
    description: "The envelope is being processed by one or more recipients"
  },
  completed_api: {
    emoji: "✅",
    title: "Completed via API",
    description: "The envelope has been completed through the DocuSign API"
  }
};

export const PlaygroundView = () => {
  const [config, setConfig] = useState<DocuSignConfig>({
    integrationKey: "",
    accountId: "",
    userId: "",
    privateKey: "",
    oAuthServer: ""
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyContent, setPrivateKeyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const [authenticated, setAuthenticated] = useState(false);
  const [envelopeId, setEnvelopeId] = useState<string>("");
  const [auth, setAuth] = useState<{
    accessToken: string;
    accountId: string;
    baseUrl: string;
    type: 'navigator'
  } | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [showSigningDialog, setShowSigningDialog] = useState(false);
  const [tabPositions, setTabPositions] = useState<TabPosition[]>([]);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch initial configuration
    fetch('/api/docusign/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        // Store the actual private key content
        setPrivateKeyContent(data.privateKey || '');
      })
      .catch(error => {
        console.error('Error loading config:', error);
        setStatus(`Error: ${error.message}`);
      });
  }, []);

  const toggleEdit = () => {
    if (isEditing) {
      // Fetch config again to reset
      fetch('/api/docusign/config')
        .then(res => res.json())
        .then(data => {
          setConfig(data);
        })
        .catch(error => {
          console.error('Error resetting config:', error);
        });
    }
    setIsEditing(!isEditing);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleConfigChange = (key: keyof DocuSignConfig) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setConfig(prev => ({ ...prev, [key]: e.target.value }));
  };

  // DocuSign API operations
  const operations = {
    authenticate: async () => {
      try {
        setStatus(
          "🔄 Authenticating...\n" +
          "Connecting to DocuSign and requesting JWT token..."
        );
        const response = await fetch('/api/docusign/authenticate', {
          method: 'POST'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Authentication failed');
        }

        const authData = await response.json();
        setAuth(authData);
        setAuthenticated(true);
        setStatus(
          "✅ Authentication Successful!\n\n" +
          "Connected to DocuSign with:\n" +
          `Account ID: ${authData.accountId}\n` +
          "Access Token: [Secured]\n\n" +
          "You can now create and send envelopes."
        );
      } catch (error: any) {
        setStatus(
          "❌ Authentication Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please check your configuration and try again."
        );
      }
    },

    createEnvelope: async () => {
      if (!auth || !authenticated) {
        setStatus(
          "❌ Not Authenticated\n\n" +
          "Please authenticate with DocuSign first before creating an envelope."
        );
        return;
      }
      if (!selectedFile) {
        setStatus(
          "❌ No File Selected\n\n" +
          "Please select a document to create an envelope."
        );
        return;
      }
      
      try {
        setStatus(
          "🔄 Creating Envelope...\n\n" +
          "1. Uploading document\n" +
          "2. Setting up recipients\n" +
          "3. Configuring signature fields"
        );
        const formData = new FormData();
        formData.append('signerEmail', recipients.split('\n')[0].trim());
        formData.append('signerName', 'Test Signer');
        formData.append('document', selectedFile);

        // Add tab positions
        const tabs = {
          signHereTabs: tabPositions.map(pos => ({
            ...pos,
            documentId: '1',
            recipientId: '1'
          }))
        };
        formData.append('tabs', JSON.stringify(tabs));

        // Add template variables
        formData.append('templateData', JSON.stringify(templateVariables));

        const response = await fetch('/api/docusign/envelope', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create envelope');
        }

        const result = await response.json();
        setEnvelopeId(result.envelopeId);
        setStatus(
          "✅ Envelope Created Successfully!\n\n" +
          `Envelope ID: ${result.envelopeId}\n` +
          "Status: Draft\n\n" +
          "You can now:\n" +
          "• Send the envelope to recipients\n" +
          "• Add more signature positions\n" +
          "• Check envelope status"
        );
      } catch (error: any) {
        setStatus(
          "❌ Envelope Creation Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please check your document and try again."
        );
      }
    },

    getEnvelopes: async () => {
      if (!auth || !authenticated) {
        setStatus("Error: Please authenticate first");
        return;
      }
      
      try {
        setStatus("Fetching envelopes...");
        const response = await fetch('/api/docusign/envelopes', {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to list envelopes');
        }

        const result = await response.json();
        setStatus(`Found ${result.envelopes.length} envelopes:\n${
          result.envelopes.map((env: any) => 
            `${env.envelopeId}: ${env.status} (${env.emailSubject})`
          ).join('\n')
        }`);
      } catch (error: any) {
        setStatus(`Failed to fetch envelopes: ${error.message}`);
      }
    },

    getEnvelopeStatus: async () => {
      if (!auth || !authenticated) {
        setStatus(
          "❌ Not Authenticated\n\n" +
          "Please authenticate with DocuSign first before checking status."
        );
        return;
      }
      if (!envelopeId) {
        setStatus(
          "❌ No Envelope Selected\n\n" +
          "Please create an envelope first before checking status."
        );
        return;
      }
      
      try {
        setStatus(
          "🔄 Checking Envelope Status...\n" +
          "Fetching latest information from DocuSign..."
        );
        const response = await fetch(`/api/docusign/envelopes/${envelopeId}`, {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get envelope status');
        }

        const result = await response.json();
        const status = result.status.toLowerCase();
        const statusInfo = ENVELOPE_STATUSES[status] || {
          emoji: "❓",
          title: status,
          description: "Unknown status"
        };

        setStatus(
          `${statusInfo.emoji} Envelope Status: ${statusInfo.title}\n\n` +
          `Description: ${statusInfo.description}\n\n` +
          `Created: ${result.createdDateTime}\n` +
          (result.sentDateTime ? `Sent: ${result.sentDateTime}\n` : '') +
          (result.completedDateTime ? `Completed: ${result.completedDateTime}\n` : '') +
          "\nAll Possible Statuses:\n" +
          Object.entries(ENVELOPE_STATUSES)
            .map(([_key, info] : [any, any]) => `${info.emoji} ${info.title}: ${info.description}`)
            .join('\n\n')
        );
      } catch (error: any) {
        setStatus(
          "❌ Status Check Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please try again later."
        );
      }
    },

    openSigningView: async () => {
      if (!auth || !authenticated) {
        setStatus("Error: Please authenticate first");
        return;
      }
      if (!envelopeId) {
        setStatus("Error: No envelope ID. Create an envelope first.");
        return;
      }

      try {
        setStatus("Getting signing URL...");
        const response = await fetch(`/api/docusign/envelopes/${envelopeId}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: recipients.split('\n')[0].trim(),
            name: "Test Signer"
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get signing URL');
        }

        const { url } = await response.json();
        setSigningUrl(url);
        setShowSigningDialog(true);
        setStatus('Signing view ready');
      } catch (error: any) {
        setStatus(`Failed to get signing URL: ${error.message}`);
      }
    },

    sendEnvelope: async () => {
      if (!auth || !authenticated) {
        setStatus(
          "❌ Not Authenticated\n\n" +
          "Please authenticate with DocuSign first before sending an envelope."
        );
        return;
      }
      if (!envelopeId) {
        setStatus(
          "❌ No Envelope Selected\n\n" +
          "Please create an envelope first before sending."
        );
        return;
      }
      if (!recipients) {
        setStatus(
          "❌ No Recipients\n\n" +
          "Please add at least one recipient email address."
        );
        return;
      }

      try {
        const recipientsList = recipients.split('\n')
          .filter(email => email.trim())
          .map((email, index) => ({
            email: email.trim(),
            name: `Recipient ${index + 1}`,
            recipientId: (index + 1).toString(),
            routingOrder: (index + 1).toString()
          }));

        setStatus(
          "🔄 Sending Envelope...\n\n" +
          "1. Updating recipients\n" +
          "2. Configuring email notifications\n" +
          "3. Sending to DocuSign\n\n" +
          `Recipients:\n${recipientsList.map(r => `• ${r.email}`).join('\n')}`
        );

        const response = await fetch(`/api/docusign/envelopes/${envelopeId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'sent',
            recipients: recipientsList
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send envelope');
        }

        const result = await response.json();
        
        // Log the result to see what we're getting back
        console.log('Send envelope result:', result);

        setStatus(
          "✅ Envelope Sent Successfully!\n\n" +
          `Status: ${result.status}\n` +
          `Created: ${result.details.created}\n` +
          `Sent: ${result.details.sentDateTime}\n` +
          `Subject: ${result.details.emailSubject}\n\n` +
          "Recipients will receive email notifications to:\n" +
          recipientsList.map(r => `• ${r.email}`).join('\n') + "\n\n" +
          "They can click the link in their email to sign the document."
        );
      } catch (error: any) {
        setStatus(
          "❌ Send Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please check recipient emails and try again."
        );
      }
    },

    // Add new Navigator API operations
    testNavigator: async () => {
      if (!auth || !authenticated) {
        setStatus("Error: Please authenticate first");
        return;
      }

      try {
        setStatus(`🔄 Testing Navigator API...\nUsing Base URL: ${auth.baseUrl}\n\nFetching agreements list...`);
        
        const listResponse = await fetch('/api/docusign/navigator?useMock=false', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId
          }
        });

        const data = await listResponse.json();

        // Handle token expiration
        if (listResponse.status === 401) {
          console.log('Token expired, re-authenticating...');
          // Clear auth and try authenticating again
          setAuth(null);
          setAuthenticated(false);
          localStorage.removeItem('navigatorAuth');
          
          // Trigger authentication
          await operations.authenticateNavigator();
          return;
        }

        // Update status with agreements list
        setStatus(prev => prev + "\n\nAgreements found:\n" + 
          (data.agreements?.length ? 
            data.agreements.map((a: any) => 
              `• ${a.file_name} (ID: ${a.id})`
            ).join('\n')
            : "No agreements found")
        );

        // If we have agreements, get details for the first one
        if (data.agreements?.length > 0) {
          const firstAgreement = data.agreements[0];
          
          setStatus(prev => prev + "\n\nFetching details for first agreement...");
          
          const detailsResponse = await fetch(
            `/api/docusign/navigator?agreementId=${firstAgreement.id}&useMock=false`,
            {
              headers: {
                'Authorization': `Bearer ${auth.accessToken}`,
                'Account-Id': auth.accountId
              }
            }
          );

          if (!detailsResponse.ok) {
            const errorText = await detailsResponse.text();
            throw new Error(`Failed to fetch agreement details: ${errorText}`);
          }

          const details = await detailsResponse.json();
          
          setStatus(prev => prev + "\n\nAgreement Details:\n" + 
            JSON.stringify(details, null, 2)
          );
        }

      } catch (error: any) {
        console.error('Navigator API error:', error);
        setStatus(
          "❌ Navigator API Test Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Check the browser console for more details."
        );
      }
    },

    testNavigatorMock: async () => {
      try {
        setStatus("🔄 Testing Navigator API (Mock Mode)...\n\nFetching mock agreements list...");
        
        // Get mock agreements list
        const listResponse = await fetch('/api/docusign/navigator?useMock=true', {
          method: 'POST'
        });

        if (!listResponse.ok) {
          throw new Error('Failed to fetch mock agreements list');
        }

        const agreements = await listResponse.json();
        
        setStatus(prev => prev + "\n\nMock Agreements:\n" + 
          agreements.agreements.map((a: any) => 
            `• ${a.file_name} (ID: ${a.id})`
          ).join('\n')
        );

        // Get mock details for first agreement
        const detailsResponse = await fetch(
          `/api/docusign/navigator?agreementId=mock-agreement-1&useMock=true`
        );

        if (!detailsResponse.ok) {
          throw new Error('Failed to fetch mock agreement details');
        }

        const details = await detailsResponse.json();
        
        setStatus(prev => prev + "\n\nMock Agreement Details:\n" + 
          JSON.stringify(details, null, 2)
        );

      } catch (error: any) {
        setStatus(`Failed to test Navigator API mock: ${error.message}`);
      }
    },

    authenticateNavigator: async () => {
      try {
        setStatus("🔄 Authenticating with Navigator API...");
        
        const response = await fetch('/api/docusign/navigator/authenticate', {
          method: 'POST'
        });

        const data = await response.json();
        console.log('Authentication response:', data);

        if (data.error === 'Consent required' && data.consentUrl) {
          const consentWindow = window.open(data.consentUrl, '_blank');
          
          if (!consentWindow) {
            setStatus(
              "❌ Popup Blocked\n\n" +
              "Please allow popups for this site and try again.\n" +
              "Consent URL: " + data.consentUrl
            );
            return;
          }

          setStatus(
            "⚠️ Consent Required\n\n" +
            "A new window has opened for you to grant consent.\n" +
            "Please complete the consent process in the new window.\n" +
            "After granting consent, click 'Authenticate (Navigator)' again.\n\n" +
            "If you don't see the window, click here: " +
            data.consentUrl
          );

          setAuth(null);
          setAuthenticated(false);
          localStorage.removeItem('navigatorAuth');
          return;
        }

        if (!response.ok || !data.baseUrl) {
          throw new Error(data.error || 'Failed to authenticate with Navigator');
        }

        const authData = {
          accessToken: data.accessToken,
          accountId: data.accountId,
          baseUrl: data.baseUrl,
          type: 'navigator' as const
        };

        localStorage.setItem('navigatorAuth', JSON.stringify(authData));
        setAuth(authData);
        setAuthenticated(true);
        setStatus(`✅ Navigator Authentication Successful\nBase URL: ${data.baseUrl}`);

      } catch (error: any) {
        console.error('Navigator authentication error:', error);
        setStatus(
          "❌ Navigator Authentication Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please check your configuration and try again."
        );
      }
    }
  };

  // Add this to handle the callback
  useEffect(() => {
    // First check URL parameters
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      setStatus(`❌ Navigator Authentication Failed: ${error}`);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Then check localStorage
    const storedAuth = localStorage.getItem('navigatorAuth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setAuth(authData);
        setAuthenticated(true);
        setStatus(`✅ Navigator Authentication Successful\nBase URL: ${authData.baseUrl}`);
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
        localStorage.removeItem('navigatorAuth');
      }
    }
  }, []);

  // Update the logout or cleanup function to clear localStorage
  const handleLogout = () => {
    setAuth(null);
    setAuthenticated(false);
    localStorage.removeItem('navigatorAuth');
  };

  return (
    <>
      <Card className="w-full">
        <ScrollArea className="h-[85vh]">
          <Tabs defaultValue="config">
            <TabsList>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="docusign">DocuSign</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleEdit}
                >
                  {isEditing ? 'Cancel Editing' : 'Edit Configuration'}
                </Button>
              </div>

              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Integration Key</h3>
                  <Input
                    placeholder="DocuSign Integration Key"
                    value={config.integrationKey}
                    onChange={handleConfigChange("integrationKey")}
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Account ID</h3>
                  <Input
                    placeholder="DocuSign Account ID"
                    value={config.accountId}
                    onChange={handleConfigChange("accountId")}
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">User ID</h3>
                  <Input
                    placeholder="DocuSign User ID"
                    value={config.userId}
                    onChange={handleConfigChange("userId")}
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Private Key (RSA)</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste your RSA private key here"
                    value={showPrivateKey ? privateKeyContent : '••••••••••••••••••••••••••••••••'}
                    onChange={(e) => {
                      setPrivateKeyContent(e.target.value);
                      handleConfigChange("privateKey")(e);
                    }}
                    className="font-mono text-sm"
                    rows={8}
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">OAuth Server</h3>
                  <Input
                    value={config.oAuthServer}
                    onChange={handleConfigChange("oAuthServer")}
                    readOnly={!isEditing}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="docusign" className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.authenticate}
                  >
                    Authenticate (eSignature)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.authenticateNavigator}
                  >
                    Authenticate (Navigator)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                    disabled={!authenticated}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-medium">Document Upload</h3>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                  />
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-medium">Recipients</h3>
                  <Textarea
                    placeholder="Enter email addresses (one per line)"
                    value={recipients}
                    onChange={(e) => {
                      console.log('Recipients changed:', e.target.value);
                      setRecipients(e.target.value);
                    }}
                    rows={3}
                  />
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-medium">Signature Positions</h3>
                  <div className="space-y-2">
                    {tabPositions.map((pos, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Page"
                          value={pos.pageNumber}
                          onChange={(e) => {
                            const newPositions = [...tabPositions];
                            newPositions[index].pageNumber = e.target.value;
                            setTabPositions(newPositions);
                          }}
                          className="w-20"
                        />
                        <Input
                          placeholder="X"
                          value={pos.xPosition}
                          onChange={(e) => {
                            const newPositions = [...tabPositions];
                            newPositions[index].xPosition = e.target.value;
                            setTabPositions(newPositions);
                          }}
                          className="w-20"
                        />
                        <Input
                          placeholder="Y"
                          value={pos.yPosition}
                          onChange={(e) => {
                            const newPositions = [...tabPositions];
                            newPositions[index].yPosition = e.target.value;
                            setTabPositions(newPositions);
                          }}
                          className="w-20"
                        />
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setTabPositions(positions => 
                              positions.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTabPositions(positions => [
                          ...positions,
                          {
                            pageNumber: '1',
                            xPosition: '100',
                            yPosition: '100',
                            name: `SignHere_${positions.length + 1}`,
                            tabLabel: `SignHere_${positions.length + 1}`
                          }
                        ]);
                      }}
                    >
                      Add Signature Position
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-medium">Template Variables</h3>
                  <div className="space-y-2">
                    {Object.entries(templateVariables).map(([key, value], index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Variable Name"
                          value={key}
                          onChange={(e) => {
                            const newVars = { ...templateVariables };
                            delete newVars[key];
                            newVars[e.target.value] = value;
                            setTemplateVariables(newVars);
                          }}
                        />
                        <Input
                          placeholder="Value"
                          value={value}
                          onChange={(e) => {
                            setTemplateVariables(vars => ({
                              ...vars,
                              [key]: e.target.value
                            }));
                          }}
                        />
                        <Button
                          variant="destructive"
                          onClick={() => {
                            const newVars = { ...templateVariables };
                            delete newVars[key];
                            setTemplateVariables(newVars);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTemplateVariables(vars => ({
                          ...vars,
                          [`variable_${Object.keys(vars).length + 1}`]: ''
                        }));
                      }}
                    >
                      Add Variable
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-medium">Navigator API Testing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={operations.testNavigator}
                      disabled={!authenticated}
                    >
                      Test Navigator API
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={operations.testNavigatorMock}
                    >
                      Test Navigator API (Mock)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.createEnvelope}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Create Envelope
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.sendEnvelope}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Envelope
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.getEnvelopes}
                  >
                    <List className="h-4 w-4 mr-2" />
                    List Envelopes
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.getEnvelopeStatus}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={operations.openSigningView}
                    disabled={!envelopeId}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Sign Document
                  </Button>
                </div>
              </div>

              {status && (
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{status}</pre>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </Card>

      <Dialog open={showSigningDialog} onOpenChange={setShowSigningDialog}>
        <DialogContent className="max-w-[90vw] w-[800px] h-[90vh]">
          <DialogHeader>
            <DialogTitle>DocuSign Signing</DialogTitle>
          </DialogHeader>
          {signingUrl && (
            <iframe 
              src={signingUrl}
              className="w-full h-full border-0"
              title="DocuSign Signing"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}; 