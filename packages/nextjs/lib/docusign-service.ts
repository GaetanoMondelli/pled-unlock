export class DocuSignService {
  private config: any = null;
  private auth: any = null;

  get isAuthenticated() {
    return !!(this.auth?.accessToken && this.auth?.accountId);
  }

  setAuth(auth: any) {
    this.auth = auth;
  }

  getHeaders() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated for DocuSign API');
    }
    return {
      'Authorization': `Bearer ${this.auth.accessToken}`,
      'Account-Id': this.auth.accountId,
      'Content-Type': 'application/json'
    };
  }

  async getConfig() {
    if (!this.config) {
      const response = await fetch('/api/docusign/config');
      this.config = await response.json();
    }
    return this.config;
  }

  async authenticate() {
    const response = await fetch('/api/docusign/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.error === 'consent_required' && data.consentUrl) {
      window.location.href = data.consentUrl;
      return null;
    }
    return data;
  }

  async listEnvelopes() {
    const response = await fetch('/api/docusign/envelope', {
      headers: this.getHeaders()
    });
    return await response.json();
  }

  async getEnvelope(envelopeId: string) {
    const response = await fetch(`/api/docusign/envelope/${envelopeId}`, {
      headers: this.getHeaders()
    });
    return await response.json();
  }

  async listNavigatorAgreements() {
    const response = await fetch('/api/docusign/navigator/agreements', {
      headers: this.getHeaders()
    });
    return await response.json();
  }

  async getNavigatorAgreement(agreementId: string) {
    const response = await fetch(`/api/docusign/navigator/agreements/${agreementId}`, {
      headers: this.getHeaders()
    });
    return await response.json();
  }

  async listClickwraps() {
    const response = await fetch('/api/docusign/click/clickwraps', {
      headers: this.getHeaders()
    });
    return await response.json();
  }

  async getClickwrap(clickwrapId: string) {
    const response = await fetch(`/api/docusign/click/clickwraps/${clickwrapId}`, {
      headers: this.getHeaders()
    });
    return await response.json();
  }
} 