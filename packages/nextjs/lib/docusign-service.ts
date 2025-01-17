export class DocuSignService {
  private accessToken: string | null = null;
  private accountId: string | null = null;
  private basePath: string | null = null;

  constructor() {
    // No need for constructor parameters anymore since we're using API routes
  }

  async authenticate() {
    try {
      console.log('Starting authentication...');
      const response = await fetch('/api/docusign/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Got response:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.status === 401 && data.consentUrl) {
        console.log('Consent required, opening URL:', data.consentUrl);
        window.open(data.consentUrl, '_blank');
        throw new Error('Please grant consent in the new window and try authenticating again');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      this.accessToken = data.accessToken;
      this.accountId = data.accountId;
      this.basePath = data.basePath;

      console.log('Authentication successful');
      return data;
    } catch (error: any) {
      console.error('Authentication error:', error);
      throw new Error(error.message || 'Authentication failed');
    }
  }

  async createAndSendEnvelope(params: {
    signerEmail: string;
    signerName: string;
    documents: Array<{
      name: string;
      fileBuffer: ArrayBuffer;
      fileExtension: string;
    }>;
  }) {
    if (!this.accessToken || !this.accountId) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const formData = new FormData();
      formData.append('signerEmail', params.signerEmail);
      formData.append('signerName', params.signerName);
      
      params.documents.forEach((doc, i) => {
        const blob = new Blob([doc.fileBuffer], { type: 'application/octet-stream' });
        formData.append(`document${i}`, blob, doc.name);
      });

      const response = await fetch('/api/docusign/envelope', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create envelope');
      }

      return response.json();
    } catch (error: any) {
      console.error('Create envelope error:', error);
      throw new Error(error.message || 'Failed to create envelope');
    }
  }

  async listEnvelopes() {
    if (!this.accessToken || !this.accountId) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch('/api/docusign/envelopes', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list envelopes');
      }

      return response.json();
    } catch (error: any) {
      console.error('List envelopes error:', error);
      throw new Error(error.message || 'Failed to list envelopes');
    }
  }

  async getEnvelopeStatus(envelopeId: string) {
    if (!this.accessToken || !this.accountId) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch(`/api/docusign/envelopes/${envelopeId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get envelope status');
      }

      return response.json();
    } catch (error: any) {
      console.error('Get envelope status error:', error);
      throw new Error(error.message || 'Failed to get envelope status');
    }
  }
} 