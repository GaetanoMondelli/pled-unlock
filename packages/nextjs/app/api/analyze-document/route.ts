import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const AVAILABLE_MODELS = {
  "gpt-4-turbo-preview": "GPT-4 Turbo",
  "gpt-4": "GPT-4",
  "gpt-3.5-turbo": "GPT-3.5 Turbo"
} as const;

type ModelId = keyof typeof AVAILABLE_MODELS;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Add mock response for development
const MOCK_RESPONSE = {
  name: "Contract Review Process",
  description: "Standard procedure for reviewing and signing legal documents",
  stateMachine: {
    fsl: "idle 'start' -> review; review 'approve' -> signing; review 'reject' -> rejected; signing 'signed' -> completed; rejected 'revise' -> review;"
  },
  eventTypes: [
    {
      type: "EMAIL_RECEIVED",
      schema: {
        from: "string",
        to: "string",
        subject: "string",
        body: "string"
      }
    },
    {
      type: "DOCUSIGN_CLICKWRAP",
      schema: {
        userId: "string",
        agreementId: "string",
        status: "string",
        timestamp: "string"
      }
    },
    {
      type: "DOCUSIGN_ENVELOPE",
      schema: {
        envelopeId: "string",
        status: "string",
        signers: "array",
        documentName: "string"
      }
    }
  ],
  messageRules: [
    {
      matches: {
        type: "EMAIL_RECEIVED",
        conditions: {
          from: "{{sender.email}}",
          subject: "(contains) start review"
        }
      },
      generates: {
        type: "start",
        template: {
          title: "New Review Process Started",
          content: "Review process initiated by {{sender.name}}"
        }
      }
    },
    {
      matches: {
        type: "EMAIL_RECEIVED",
        conditions: {
          from: "{{reviewer.email}}",
          subject: "(contains) approved"
        }
      },
      generates: {
        type: "approve",
        template: {
          title: "Document Approved",
          content: "Document approved by {{reviewer.name}}"
        }
      }
    },
    {
      matches: {
        type: "DOCUSIGN_ENVELOPE",
        conditions: {
          status: "completed"
        }
      },
      generates: {
        type: "signed",
        template: {
          title: "Document Signed",
          content: "Contract has been signed by all parties"
        }
      }
    }
  ],
  variables: {
    sender: {
      name: { type: "string", required: true },
      email: { type: "string", required: true }
    },
    reviewer: {
      name: { type: "string", required: true },
      email: { type: "string", required: true }
    },
    contract: {
      title: { type: "string", required: true },
      type: { type: "string", required: true }
    }
  },
  actions: {
    review: ["send_review_notification", "create_docusign_envelope"],
    signing: ["send_signing_request"],
    completed: ["send_completion_notification", "archive_document"]
  }
};

// First prompt to get state machine and event types
const getBasicStructurePrompt = `Analyze the document and create:

1. A state machine in FSL notation that represents the document workflow
2. Event types that will trigger transitions
3. Required variables for the workflow

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
      "schema": {
        "field1": "type"
      }
    }
  ],
  "variables": {
    "group": {
      "field": { "type": "string", "required": boolean }
    }
  }
}`;

// Second prompt to generate message rules based on state machine
const getMessageRulesPrompt = (fsm: string, eventTypes: any[], variables: any) => `
Given this state machine:
${fsm}

And these event types:
${JSON.stringify(eventTypes, null, 2)}

Create message rules where:
1. EVERY rule MUST generate an event that matches one of the FSM transitions
2. EVERY transition in the FSM must have at least one rule that generates it
3. Use ONLY the provided event types
4. Reference these available variables:
${JSON.stringify(variables, null, 2)}

Available transitions from FSM:
${extractTransitions(fsm).map(t => `- '${t}'`).join('\n')}

Format response as JSON array of rules:
[
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
]

REQUIREMENTS:
- Each rule's "generates.type" MUST exactly match one of the FSM transitions
- Every FSM transition must have a corresponding rule
- Rules must use the provided event types
- Rules should have meaningful conditions and templates`;

export async function POST(req: Request) {
  try {
    const { documentContent, model = "gpt-4" } = await req.json();

    if (!documentContent) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }

    if (!Object.keys(AVAILABLE_MODELS).includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      );
    }

    // Use mock response for development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        template: {
          ...MOCK_RESPONSE,
          templateId: `template_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }

    // First API call - Get basic structure
    const structureCompletion = await openai.chat.completions.create({
      model: model as ModelId,
      messages: [
        { role: "system", content: getBasicStructurePrompt },
        { role: "user", content: documentContent }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const basicStructure = JSON.parse(structureCompletion.choices[0].message.content || "{}");

    // Second API call - Get message rules
    const rulesCompletion = await openai.chat.completions.create({
      model: model as ModelId,
      messages: [
        { 
          role: "system", 
          content: getMessageRulesPrompt(
            basicStructure.stateMachine.fsl,
            basicStructure.eventTypes,
            basicStructure.variables
          )
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const messageRules = JSON.parse(rulesCompletion.choices[0].message.content || "[]");

    // Validate rules and transitions
    const transitions = extractTransitions(basicStructure.stateMachine.fsl);
    const ruleEvents = messageRules.map((rule: any) => rule.generates.type);
    
    // Check for missing rules
    const missingRules = transitions.filter(t => !ruleEvents.includes(t));
    if (missingRules.length > 0) {
      throw new Error(`Missing message rules for transitions: ${missingRules.join(', ')}`);
    }

    // Check for invalid rules
    const invalidRules = ruleEvents.filter(e => !transitions.includes(e));
    if (invalidRules.length > 0) {
      throw new Error(`Rules generate invalid transitions: ${invalidRules.join(', ')}`);
    }

    // Combine results
    const template = {
      ...basicStructure,
      messageRules,
      templateId: `template_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modelUsed: AVAILABLE_MODELS[model as ModelId]
    };

    return NextResponse.json({ template });

  } catch (error: any) {
    console.error('Error analyzing document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze document',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to extract transitions from FSM
function extractTransitions(fsl: string): string[] {
  const transitions: string[] = [];
  const regex = /'([^']+)'/g;
  let match;
  
  while ((match = regex.exec(fsl)) !== null) {
    transitions.push(match[1]);
  }
  
  return transitions;
} 