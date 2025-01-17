"use client"

import { useState } from "react"
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
  List
} from "lucide-react"

interface DocuSignConfig {
  integrationKey: string;
  accountId: string;
  userId: string;
  privateKey: string;
}

export const PlaygroundView = () => {
  const [config, setConfig] = useState<DocuSignConfig>({
    integrationKey: "",
    accountId: "",
    userId: "",
    privateKey: ""
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string>("");
  const [status, setStatus] = useState<string>("");

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

  // DocuSign API operations would go here
  const operations = {
    createEnvelope: async () => {
      setStatus("Creating envelope...");
      // Implementation pending
    },
    getEnvelopes: async () => {
      setStatus("Fetching envelopes...");
      // Implementation pending
    },
    sendEnvelope: async () => {
      setStatus("Sending envelope...");
      // Implementation pending
    },
    getEnvelopeStatus: async () => {
      setStatus("Checking status...");
      // Implementation pending
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
            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Integration Key</h3>
                <Input
                  placeholder="DocuSign Integration Key"
                  value={config.integrationKey}
                  onChange={handleConfigChange("integrationKey")}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Account ID</h3>
                <Input
                  placeholder="DocuSign Account ID"
                  value={config.accountId}
                  onChange={handleConfigChange("accountId")}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">User ID (Email)</h3>
                <Input
                  placeholder="DocuSign User ID"
                  value={config.userId}
                  onChange={handleConfigChange("userId")}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Private Key (RSA)</h3>
                <Textarea
                  placeholder="Paste your RSA private key here"
                  value={config.privateKey}
                  onChange={handleConfigChange("privateKey")}
                  className="font-mono text-sm"
                  rows={8}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-4">
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
                <pre className="text-sm">{status}</pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </Card>
  );
}; 