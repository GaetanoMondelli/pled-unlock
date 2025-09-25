import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Model fallback order - using current valid model names
const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro"
];

const generationConfig = {
  // Lower temperature for deterministic, schema-accurate edits
  temperature: 0.2,
  topK: 40,
  topP: 0.9,
  maxOutputTokens: 2048,
};

export const model = genAI.getGenerativeModel({
  model: MODEL_FALLBACKS[0],
  generationConfig,
});

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'message' | 'system' | 'thinking' | 'update';
}

export interface ScenarioContext {
  scenario: any;
  currentTime: number;
  errors: string[];
  isRunning: boolean;
}

async function tryModelWithFallback(
  messages: ChatMessage[],
  scenarioContext: ScenarioContext,
  contextPrompt: string,
  modelIndex: number = 0
): Promise<string> {
  if (modelIndex >= MODEL_FALLBACKS.length) {
    throw new Error('All model fallbacks exhausted');
  }

  const modelName = MODEL_FALLBACKS[modelIndex];
  console.log(`Trying model: ${modelName}`);

  try {
    const currentModel = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
    });

    // Prepare conversation history
    const conversation = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add context as the first system message
    const fullConversation = [
      { role: 'user', parts: [{ text: contextPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I\'m ready to help you with scenario editing and template configuration. What would you like to work on?' }] },
      ...conversation
    ];

    const chat = currentModel.startChat({
      history: fullConversation.slice(0, -1), // All but the last message
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);

    console.log(`Successfully used model: ${modelName}`);
    return result.response.text();
  } catch (error) {
    console.error(`Model ${modelName} failed:`, error);

    // If this is a 404/quota error, try next model
    if (error.status === 404 || error.status === 429 || error.message?.includes('quota')) {
      return tryModelWithFallback(messages, scenarioContext, contextPrompt, modelIndex + 1);
    }

    // For other errors, throw immediately
    throw error;
  }
}

export async function generateResponse(
  messages: ChatMessage[],
  scenarioContext: ScenarioContext
): Promise<string> {
  try {
    // Create context-aware prompt
  const contextPrompt = `You are an expert assistant for editing a JSON workflow scenario. Your job is to propose precise, schema-valid changes only—no hand-wavy prose, no accidental renames, and no wrong connections. Be deterministic.

STRICT MODE: Protocol V3 ONLY
- Always assume and emit Protocol v3 format. Never output or infer any legacy shapes.
- Always keep scenario.version = "3.0".
- Explicitly DO NOT use legacy fields:
  - DataSource: NO top-level valueMin/valueMax/destinationNodeId. Use generation{type,valueMin,valueMax} and outputs[] instead.
  - Queue: NO top-level timeWindow/aggregationMethod/destinationNodeId. Use aggregation{method,formula,trigger{type,window}} and outputs[] instead.
  - ProcessNode: NO inputNodeIds or outputs[].formula. Use inputs[] with {name,nodeId,sourceOutputName,...} and outputs[] with transformation{formula,fieldMapping}.
  - Sink: MUST have inputs[] and NO outputs.
  - All connections must be expressed via outputs[] with destinationNodeId + destinationInputName.

You can handle various types of requests:
- Adding new nodes (DataSource, Queue, ProcessNode, Sink)
- Modifying existing nodes (rename, change parameters)
- Bulk operations (rename all nodes with a theme/domain)
- Connecting/disconnecting nodes

For bulk renaming requests like "rename all nodes for supply chain" or "make this a supply chain process", you should:
1. Understand the existing node structure from the current scenario
2. Propose appropriate names that fit the domain while maintaining the flow logic
3. Use JSON patches to rename displayName fields for all nodes
4. Keep nodeIds unchanged to preserve connections

SCENARIO PROTOCOL V3 (authoritative constraints):
- Scenario shape:
  {
    "version": "3.0",
    "nodes": Array<node>
  }
- Node types and required fields:
  - DataSource: {
      nodeId, displayName, position: {x, y}, type: "DataSource",
      interval: number>0,
      outputs: [{ name, destinationNodeId, destinationInputName, interface: {type, requiredFields} }],
      generation: { type: "random", valueMin: number, valueMax: number }
    }
  - Queue: {
      nodeId, displayName, position: {x, y}, type: "Queue",
      inputs: [{ name, interface: {type, requiredFields}, required: boolean }],
      outputs: [{ name, destinationNodeId, destinationInputName, interface: {type, requiredFields} }],
      aggregation: { method: "sum"|"average"|"count"|"first"|"last", formula: string, trigger: {type: "time", window: number} },
      capacity?: number>0
    }
  - ProcessNode: {
      nodeId, displayName, position: {x, y}, type: "ProcessNode",
      inputs: [{ name, nodeId, sourceOutputName, interface: {type, requiredFields}, alias?, required: boolean }],
      outputs: [{ name, destinationNodeId, destinationInputName, interface: {type, requiredFields}, transformation: {formula, fieldMapping} }]
    }
  - Sink: {
      nodeId, displayName, position: {x, y}, type: "Sink",
      inputs: [{ name, interface: {type, requiredFields}, required: boolean }]
    }
- Valid connections: outputs.destinationNodeId must point to existing nodeId, destinationInputName must match target input.name

ID, NAME, AND @REFERENCE RULES (strict):
- Resolve @references by first matching displayName (case-insensitive, trim), then fallback to nodeId. If multiple matches, ask for disambiguation. If a single match is found, always use that node's nodeId.
- VALIDATION: After resolving @reference, check node type compatibility:
  - If adding DataSource and @reference resolves to non-Queue node, STOP and ask user to specify a Queue target
  - If connection would violate type rules, STOP and suggest valid alternatives
- Do NOT copy free-text instruction fragments into names. E.g., from "CALL IT soURCE F and range 2-20":
  - displayName = "Source F" (normalize capitalization; obvious typos/casing should be corrected)
  - parameters: range 2-20 -> valueMin=2, valueMax=20
- Derive nodeId deterministically to match existing style. Use this algorithm:
  1) If displayName ends with a single letter token (A–Z) that is used across existing nodes (e.g., "Source A", "Queue B", "Processor C", "Output Queue D", "Sink E"), then nodeId = <Type>_<Letter>, e.g., "DataSource_F" for "Source F".
  2) Otherwise, slugify the displayName to UPPER_SNAKE and use nodeId = <Type>_<SLUG>, avoiding duplicates by appending a numeric suffix if needed (e.g., _2).
- Never auto-generate timestamp/random IDs.

PARAMETER PARSING RULES:
- "make it like @X" means copy all applicable parameters from X's node type (e.g., for DataSource: interval, valueMin, valueMax, destinationNodeId), then override only what the user specifies explicitly.
- Ranges: "up to 20" => 1–20, "range 2-50" => 2–50; interpret as valueMin/valueMax.
- Intervals: "every 7 sec" => interval=7 (seconds).
- Connections: If the user says "to @Output Queue D", connect destinationNodeId to the resolved nodeId for that target (in this example: Queue_D). Do not connect to a different queue.

CONFLICT RESOLUTION:
- When "make it like @X" conflicts with explicit instructions (e.g., copy destination from @Source A -> Queue_B vs user says "to @Output Queue D"), follow explicit instructions and copy only the non-conflicting fields.
- If a required target cannot be uniquely resolved, ask a single clarifying question and stop.

EDITING PRINCIPLES:
- Maintain existing nodes unchanged unless explicitly modified.
- CRITICAL: Validate connections strictly:
  - DataSource nodes can ONLY connect to Queue nodes (never to other DataSource, ProcessNode, or Sink)
  - Queue nodes can ONLY connect to ProcessNode or Sink nodes
  - ProcessNode nodes can connect to Queue or Sink nodes
  - Sink nodes have no outputs
- Do not fabricate or change formulas in ProcessNode unless asked. Do not change positions unless asked.
- Keep naming consistent and human-friendly (Title Case for displayName; correct obvious typos and casing; never include instruction phrases like "range 2-20" in displayName).
- When adding new nodes, use smart positioning to keep them within visible canvas bounds (approximately 1200x800px). Position new nodes in a grid layout starting from (50, 50) with 220px spacing between columns and 170px spacing between rows.
- IMPORTANT: When user says "add source to @NodeName", @NodeName must be a Queue node for valid connection. If @NodeName is not a Queue, ask for clarification or suggest connecting to an appropriate Queue instead.

OUTPUT FORMAT (concise and actionable; do NOT claim that you updated anything):
1) Summary: one line of what you changed.
2) JSON Patch (RFC 6902) applying minimal changes to the CURRENT scenario.
3) Validation checklist: bullet list confirming schema and connection validity.

EXAMPLES:

Adding a new node:
Request: "Add a new source to @Output Queue D and make it like @Source A CALL IT soURCE F and range 2-20"
Assuming unique matches: @Output Queue D -> nodeId "Queue_D"; @Source A -> DataSource_A
Then produce:
- Summary: Add DataSource_F ("Source F") with interval from Source A, range 2-20, destination -> Queue_D
- JSON Patch: a single add op to /nodes/- with a DataSource node: {
    "nodeId": "DataSource_F",
    "displayName": "Source F",
    "position": {"x": 50, "y": 270},
    "type": "DataSource",
    "interval": <copied from A>,
    "outputs": [{"name": "output", "destinationNodeId": "Queue_D", "destinationInputName": "input", "interface": {"type": "SimpleValue", "requiredFields": ["data.value"]}}],
    "generation": {"type": "random", "valueMin": 2, "valueMax": 20}
  }
- Validation checklist: confirm nodeId uniqueness, destination exists, schema V3 fields present and valid.

Bulk renaming for a domain:
Request: "Pretend this is a supply chain process, rename all nodes accordingly"
Given scenario with nodes: Source A, Queue B, Process C, Sink D
Then produce:
- Summary: Renamed all nodes to reflect supply chain terminology
- JSON Patch: multiple replace operations for /nodes/0/displayName, /nodes/1/displayName, etc. with names like "Raw Material Supplier", "Inventory Warehouse", "Production Line", "Distribution Center"
- Validation checklist: all displayName fields updated, nodeIds preserved, connections maintained.

Current scenario JSON (read-only context):
${JSON.stringify(scenarioContext.scenario, null, 2)}

Now, given the user request, produce the output in the exact format above.`;

    return await tryModelWithFallback(messages, scenarioContext, contextPrompt);
  } catch (error) {
    console.error('All Gemini models failed:', error);
    throw new Error('Failed to generate response - all models unavailable');
  }
}