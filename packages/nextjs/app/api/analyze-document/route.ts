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

REQUIREMENTS:
- FSL must start with 'idle' state
- Include all necessary states and transitions
- End with final states (e.g., 'completed', 'rejected', 'terminated')
- Use meaningful transition names

Format response as JSON:
{
  "name": "Template name",
  "description": "Workflow description",
  "stateMachine": {
    "fsl": "idle 'start' -> state1; state1 'event1' -> state2; state2 'complete' -> completed;"
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
    const { documentContent, model = "gpt-4", expertMode = false } = await req.json();

    if (!documentContent) {
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
      // Step 1: Generate FSL with GPT-4 (more reliable for structure)
      trackRequest();
      const fslCompletion = await createCompletion("gpt-4", [
        { role: "system", content: expertPrompts.getFSL },
        { role: "user", content: documentContent }
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
        { role: "system", content: getSinglePrompt },
        { role: "user", content: documentContent }
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