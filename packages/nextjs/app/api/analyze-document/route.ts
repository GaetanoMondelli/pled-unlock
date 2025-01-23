import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const AVAILABLE_MODELS = {
  "gpt-4-turbo-preview": "GPT-4 Turbo",
  "gpt-4": "GPT-4",
  "gpt-3.5-turbo": "GPT-3.5 Turbo"
} as const;

type ModelId = keyof typeof AVAILABLE_MODELS;

// Rate limiting setup
const REQUESTS_PER_MINUTE = 3;
const requestTimestamps: number[] = [];

function canMakeRequest(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  
  return requestTimestamps.length < REQUESTS_PER_MINUTE;
}

function trackRequest() {
  requestTimestamps.push(Date.now());
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Single prompt for regular mode
const getSinglePrompt = `Analyze this document and create a complete workflow template.

Create:
1. A state machine in FSL notation
2. Event types that can trigger transitions
3. Message rules that map events to transitions
4. Required variables
5. Automated actions for each state

REQUIREMENTS:
- FSL must start with 'idle' state
- Every transition must have corresponding message rules
- Event types must be realistic (emails, DocuSign events, etc.)
- Include meaningful automated actions for each state
- Use template variables (e.g., {{candidate.name}}, {{company.email}}) in actions where appropriate

Format response as JSON:
{
  "name": "Template name",
  "description": "Workflow description",
  "stateMachine": {
    "fsl": "state1 'event1' -> state2; state2 'event2' -> state3;"
  },
  "eventTypes": [
    {
      "type": "EVENT_TYPE",
      "schema": { "field1": "type" }
    }
  ],
  "messageRules": [
    {
      "matches": {
        "type": "EVENT_TYPE",
        "conditions": {}
      },
      "generates": {
        "type": "MUST_MATCH_FSM_TRANSITION",
        "template": {
          "title": "string",
          "content": "string"
        }
      }
    }
  ],
  "variables": {
    "group": {
      "field": { "type": "string", "required": boolean }
    }
  },
  "actions": {
    "state_name": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "to": "{{company.email}}",
          "subject": "Application from {{candidate.name}}",
          "body": "Dear hiring manager,\n\nA new application has been received from {{candidate.name}}."
        }
      },
      {
        "type": "DOCUSIGN_EVENT",
        "config": {
          "eventType": "check_status",
          "envelopeId": "{{docusign.envelopeId}}"
        }
      }
    ]
  }
}`;

// Expert mode prompts
const expertPrompts = {
  getFSL: `Analyze this document and create a state machine in FSL notation.
Include warning states for important dates and provisions.

REQUIREMENTS:
- FSL must start with 'idle' state
- Add warning states for critical provisions:
  * Payment deadlines (warning_payment_due)
  * Contract expiration (warning_expiring)
  * Delivery milestones (warning_delivery_due)
  * Compliance requirements (warning_compliance)
  * Renewal deadlines (warning_renewal)
- Each warning state should transition to:
  * Resolution state (if handled)
  * Violation state (if deadline missed)
  * Escalation state (if needs attention)

Example FSL patterns:
active 'payment_due_soon' -> warning_payment_due;
warning_payment_due 'payment_received' -> active;
warning_payment_due 'payment_missed' -> payment_overdue;

active 'approaching_expiry' -> warning_expiring;
warning_expiring 'renewed' -> active;
warning_expiring 'expired' -> contract_expired;

active 'delivery_approaching' -> warning_delivery_due;
warning_delivery_due 'delivered' -> delivery_complete;
warning_delivery_due 'missed_deadline' -> delivery_overdue;

Format response as JSON:
{
  "name": "Template name",
  "description": "Workflow description",
  "stateMachine": {
    "fsl": "...",
    "warningStates": [
      {
        "state": "warning_payment_due",
        "deadline": "payment_terms_due_date",
        "warningPeriod": "5 days"
      },
      {
        "state": "warning_expiring",
        "deadline": "expiration_date",
        "warningPeriod": "30 days"
      }
    ]
  }
}`,

  getMessageRules: (fsl: string, transitions: string[]) => 
  `Given this state machine:
${fsl}

And these transitions:
${transitions.join(', ')}

Create message rules and event types that map to these transitions.

Format response as JSON:
{
  "eventTypes": [
    {
      "type": "EVENT_TYPE",
      "schema": {
        "field1": "string"
      }
    }
  ],
  "messageRules": [
    {
      "matches": {
        "type": "EVENT_TYPE",
        "conditions": {}
      },
      "generates": {
        "type": "TRANSITION_NAME",
        "template": {
          "title": "string",
          "content": "string"
        }
      }
    }
  ],
  "variables": {
    "group": {
      "field": { "type": "string", "required": true }
    }
  }
}`,

  getStateActions: (states: string[], variables: any = {}) => 
  `For these states:
${states.join(', ')}

Available template variables:
${JSON.stringify(variables, null, 2)}

Define automated actions for each state. Each action must be one of:
- SEND_EMAIL
- CALL_API
- DOCUSIGN_EVENT
- DOCUSIGN_NAVIGATOR_GET_AGREEMENTS (Lists all agreements)
- DOCUSIGN_NAVIGATOR_GET_AGREEMENT (Gets specific agreement details)

Use template variables where appropriate (e.g., {{docusign.accountId}}, {{docusign.agreementId}}).

Format response as JSON:
{
  "actions": {
    "review": [
      {
        "type": "DOCUSIGN_NAVIGATOR_GET_AGREEMENTS",
        "config": {
          "accountId": "{{docusign.accountId}}",
          "limit": 10
        }
      }
    ],
    "pending_signature": [
      {
        "type": "DOCUSIGN_NAVIGATOR_GET_AGREEMENT",
        "config": {
          "accountId": "{{docusign.accountId}}",
          "agreementId": "{{docusign.agreementId}}"
        }
      }
    ]
  }
}`
};

// Helper functions
function extractTransitions(fsl: string): string[] {
  const transitions: string[] = [];
  const regex = /'([^']+)'/g;
  let match;
  while ((match = regex.exec(fsl)) !== null) {
    transitions.push(match[1]);
  }
  return transitions;
}

function extractStates(fsl: string): string[] {
  const states = new Set<string>();
  const regex = /(\w+)\s+'[^']+'\s*->\s*(\w+)/g;
  let match;
  while ((match = regex.exec(fsl)) !== null) {
    states.add(match[1]);
    states.add(match[2]);
  }
  return Array.from(states);
}

// Helper function to create completion with proper options
async function createCompletion(model: ModelId, messages: any[]) {
  const options: any = {
    model,
    messages,
    temperature: 0.7,
  };

  // Add response_format only for models that support it
  if (model === "gpt-4-turbo-preview") {
    options.response_format = { type: "json_object" };
  }

  const completion = await openai.chat.completions.create(options);
  return completion;
}

export async function POST(req: Request) {
  try {
    const { content, model = "gpt-4", expertMode = false, useNavigatorInsight = false, navigatorDocumentId } = await req.json();

    let navigatorData = null;
    let prompt = getSinglePrompt;

    // Get Navigator data if enabled
    if (useNavigatorInsight && navigatorDocumentId) {
      try {
        const auth = JSON.parse(localStorage.getItem('navigatorAuth') || '{}');
        const response = await fetch('/api/docusign/navigator/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: `${auth.baseUrl}/accounts/${auth.accountId}/agreements/${navigatorDocumentId}`,
            method: 'GET',
            token: auth.accessToken
          })
        });
        
        if (response.ok) {
          navigatorData = await response.json();
          const { provisions, parties } = navigatorData.rawData;

          // Add insights to the prompt
          prompt += `\n\nConsider these patterns from a similar document:
- Parties involved: ${parties.map((p: any) => p.name_in_agreement).join(', ')}
- Contract value: ${provisions.total_agreement_value} ${provisions.total_agreement_value_currency_code}
- Payment terms: ${provisions.payment_terms_due_date} (Late fees: ${provisions.can_charge_late_payment_fees ? `${provisions.late_payment_fee_percent}%` : 'None'})
- Duration: ${provisions.effective_date} to ${provisions.expiration_date}
- Termination notice: ${provisions.termination_period_for_convenience}`;
        }
      } catch (error) {
        console.error('Error fetching Navigator data:', error);
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }

    if (!canMakeRequest()) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          details: 'Please wait 1 minute before making another request.'
        },
        { status: 429 }
      );
    }

    if (expertMode) {
      // Add Navigator insights to each expert prompt with warning thresholds
      const getFSLWithInsights = navigatorData ? 
        expertPrompts.getFSL + `\n\nConsider these patterns and warning thresholds from a similar document:
- Payment terms: ${navigatorData.rawData.provisions.payment_terms_due_date}
  * Add warning_payment_due state 5 days before due date
- Contract expiration: ${navigatorData.rawData.provisions.expiration_date}
  * Add warning_expiring state 30 days before expiration
- Late fees: ${navigatorData.rawData.provisions.can_charge_late_payment_fees ? `${navigatorData.rawData.provisions.late_payment_fee_percent}%` : 'None'}
  * Add warning_late_fee state when payment is overdue
- Termination notice: ${navigatorData.rawData.provisions.termination_period_for_convenience}
  * Add warning_termination state when notice received
- Compliance requirements:
  * Add warning_compliance state for periodic reviews
- Renewal deadlines:
  * Add warning_renewal state 45 days before expiration if auto-renewal enabled` 
        : expertPrompts.getFSL;

      trackRequest();
      const fslCompletion = await createCompletion("gpt-4", [
        { role: "system", content: getFSLWithInsights },
        { role: "user", content: content }
      ]);

      const fslStructure = JSON.parse(fslCompletion.choices[0].message.content || "{}");
      
      // Extract transitions and states from FSL
      const transitions = extractTransitions(fslStructure.stateMachine.fsl);
      const states = extractStates(fslStructure.stateMachine.fsl);

      // Step 2: Get message rules and event types using GPT-4 Turbo (faster)
      trackRequest();
      const rulesCompletion = await createCompletion("gpt-4-turbo-preview", [
        { 
          role: "system", 
          content: expertPrompts.getMessageRules(fslStructure.stateMachine.fsl, transitions)
        }
      ]);

      const rulesAndEvents = JSON.parse(rulesCompletion.choices[0].message.content || "{}");

      // Step 3: Get actions for states using GPT-4 Turbo (faster)
      trackRequest();
      const actionsCompletion = await createCompletion("gpt-4-turbo-preview", [
        { 
          role: "system", 
          content: expertPrompts.getStateActions(states, rulesAndEvents.variables)
        }
      ]);

      const actionsResult = JSON.parse(actionsCompletion.choices[0].message.content || "{}");

      // Validate the results
      const ruleEvents = rulesAndEvents.messageRules?.map((rule: any) => rule.generates.type) || [];
      
      // Check for missing rules
      const missingRules = transitions.filter(t => !ruleEvents.includes(t));
      if (missingRules.length > 0) {
        throw new Error(`Missing message rules for transitions: ${missingRules.join(', ')}`);
      }

      // Combine results
      const template = {
        ...fslStructure,
        eventTypes: rulesAndEvents.eventTypes || [],
        messageRules: rulesAndEvents.messageRules || [],
        variables: rulesAndEvents.variables || {},
        actions: actionsResult.actions || {},
        templateId: `template_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelUsed: AVAILABLE_MODELS[model as ModelId]
      };

      return NextResponse.json({ 
        template,
        progress: 'Analysis completed'
      });

    } else {
      // For regular mode, use the selected model (if not expert)
      trackRequest();
      
      const completion = await createCompletion(model as ModelId, [
        { role: "system", content: prompt },
        { role: "user", content: content }
      ]);

      const template = JSON.parse(completion.choices[0].message.content || "{}");

      // Only do basic validation in regular mode
      if (!template.stateMachine?.fsl || !template.messageRules) {
        throw new Error('Invalid template format: missing required fields');
      }

      return NextResponse.json({ 
        template: {
          ...template,
          templateId: `template_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelUsed: AVAILABLE_MODELS[model as ModelId]
        }
      });
    }
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    
    if (error.response?.status === 429 || error.message.includes('quota')) {
      return NextResponse.json(
        { 
          error: 'OpenAI API quota exceeded',
          details: 'Please check your OpenAI API key and billing settings.'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to analyze document',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 