export class DocuSignService {
  private accessToken: string | null = null;
  private accountId: string | null = null;
  private config: any = null;

  async getConfig() {
    try {
      const response = await fetch('/api/docusign/config');
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('Failed to get DocuSign config:', error);
      throw error;
    }
  }

  getAuthUrl() {
    if (!this.config) {
      throw new Error('Config not loaded. Call getConfig() first.');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri
    });

    return `${this.config.authServer}/oauth/auth?${params.toString()}`;
  }

  async handleAuthCallback(code: string) {
    // Handle the auth callback and set tokens
    // This should match the playground implementation
    const response = await fetch('/api/docusign/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      throw new Error('Auth failed');
    }

    const { access_token, account_id } = await response.json();
    this.accessToken = access_token;
    this.accountId = account_id;
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
          'Authorization': `Bearer ${this.accessToken}`,
          'Account-Id': this.accountId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list envelopes');
      }

      return response.json();
    } catch (error: any) {
      console.error('List envelopes error:', error);
      throw error;
    }
  }

  async getEnvelope(envelopeId: string) {
    if (!this.accessToken || !this.accountId) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch(`/api/docusign/envelopes/${envelopeId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Account-Id': this.accountId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get envelope status');
      }

      return response.json();
    } catch (error: any) {
      console.error('Get envelope status error:', error);
      throw error;
    }
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
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      // Store the tokens properly
      this.accessToken = data.accessToken;
      this.accountId = data.accountId;

      console.log('Authentication successful');
      return data;
    } catch (error: any) {
      console.error('Authentication error:', error);
      throw error;
    }
  }
} 