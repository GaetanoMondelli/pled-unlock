"use client"

import { useState, useEffect } from "react"
import { Card } from "./card"
import { ScrollArea } from "./scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Button } from "./button"
import { Input } from "./input"
import { Textarea } from "./textarea"
import {
  FileText,
  Send,
  Key,
  Mail,
  FileSignature,
  Download,
  Upload,
  List,
  Eye,
  EyeOff
} from "lucide-react"

interface DocuSignConfig {
  integrationKey: string;
  accountId: string;
  userId: string;
  privateKey: string;
  oAuthServer: string;
}

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
  const [auth, setAuth] = useState<{ accessToken: string; accountId: string } | null>(null);

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
        setStatus("Authenticating...");
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
        setStatus(`Authenticated successfully! Account ID: ${authData.accountId}`);
      } catch (error: any) {
        setStatus(`Authentication failed: ${error.message}`);
      }
    },

    createEnvelope: async () => {
      if (!auth || !authenticated) {
        setStatus("Error: Please authenticate first");
        return;
      }
      if (!selectedFile) {
        setStatus("Error: Please select a file");
        return;
      }
      
      try {
        setStatus("Creating envelope...");
        const formData = new FormData();
        formData.append('signerEmail', recipients.split('\n')[0].trim());
        formData.append('signerName', 'Test Signer');
        formData.append('document', selectedFile);

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
        setStatus(`Envelope created successfully! ID: ${result.envelopeId}`);
      } catch (error: any) {
        setStatus(`Failed to create envelope: ${error.message}`);
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
        setStatus("Error: Please authenticate first");
        return;
      }
      if (!envelopeId) {
        setStatus("Error: No envelope ID. Create an envelope first.");
        return;
      }
      
      try {
        setStatus("Checking status...");
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
        setStatus(`Envelope status: ${result.status}\nCreated: ${result.createdDateTime}`);
      } catch (error: any) {
        setStatus(`Failed to get envelope status: ${error.message}`);
      }
    }
  };

  return (
    <Card className="p-4">
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">
              <Key className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="operations">
              <FileSignature className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
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

          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-4">
              <Button
                variant="default"
                className="w-full"
                onClick={operations.authenticate}
                disabled={authenticated}
              >
                {authenticated ? "Authenticated ✓" : "Authenticate"}
              </Button>

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
                  onChange={(e) => setRecipients(e.target.value)}
                  rows={3}
                />
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
  );
}; 