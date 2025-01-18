export interface Event {
  id: string;
  type: 'email' | 'api_response' | 'file' | 'docusign_webhook';
  timestamp: string;
  source: string;
  data: {
    [key: string]: any;
    // For emails
    subject?: string;
    body?: string;
    from?: string;
    to?: string[];
    // For API responses
    status?: number;
    response?: any;
    // For files
    content?: string;
    filename?: string;
    // For DocuSign
    envelopeStatus?: string;
    envelopeId?: string;
    recipientStatus?: string[];
  };
  processed?: boolean;
  triggeredTransitions?: string[];
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  type: Event['type'];
  template: Omit<Event, 'id' | 'timestamp' | 'processed' | 'triggeredTransitions'>;
} 