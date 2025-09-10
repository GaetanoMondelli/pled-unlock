import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    // Lower temperature for deterministic, schema-accurate edits
    temperature: 0.2,
    topK: 40,
    topP: 0.9,
    maxOutputTokens: 2048,
  },
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

export async function generateResponse(
  messages: ChatMessage[], 
  scenarioContext: ScenarioContext
): Promise<string> {
  try {
    // Create context-aware prompt
  const contextPrompt = `You are an expert assistant for editing a JSON workflow scenario. Your job is to propose precise, schema-valid changes only—no hand-wavy prose, no accidental renames, and no wrong connections. Be deterministic.

SCENARIO PROTOCOL (authoritative constraints):
- Scenario shape:
  {
    "version": "1.0" (optional, defaults to 1.0),
    "nodes": Array<node>
  }
- Node types and required fields (render-only fields like position may exist but are not required for validity):
  - DataSource: { nodeId, displayName, type: "DataSource", interval>0, valueMin, valueMax, destinationNodeId }
  - Queue:      { nodeId, displayName, type: "Queue", timeWindow>0, aggregationMethod in [sum|average|count|first|last], capacity? >0, destinationNodeId }
  - ProcessNode:{ nodeId, displayName, type: "ProcessNode", inputNodeIds: string[>=1], outputs: [{ formula, destinationNodeId }][>=1] }
  - Sink:       { nodeId, displayName, type: "Sink" }
- Valid references: destinationNodeId must point to an existing nodeId.

ID, NAME, AND @REFERENCE RULES (strict):
- Resolve @references by first matching displayName (case-insensitive, trim), then fallback to nodeId. If multiple matches, ask for disambiguation. If a single match is found, always use that node's nodeId.
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
- Validate connections: destinationNodeId must refer to an existing node. For DataSource, destination should typically be a Queue (unless user specifies otherwise).
- Do not fabricate or change formulas in ProcessNode unless asked. Do not change positions unless asked.
- Keep naming consistent and human-friendly (Title Case for displayName; correct obvious typos and casing; never include instruction phrases like "range 2-20" in displayName).

OUTPUT FORMAT (concise and actionable; do NOT claim that you updated anything):
1) Summary: one line of what you changed.
2) JSON Patch (RFC 6902) applying minimal changes to the CURRENT scenario.
3) Validation checklist: bullet list confirming schema and connection validity.

MINIMAL EXAMPLE:
Request: "Add a new source to @Output Queue D and make it like @Source A CALL IT soURCE F and range 2-20"
Assuming unique matches: @Output Queue D -> nodeId "Queue_D"; @Source A -> DataSource_A
Then produce:
- Summary: Add DataSource_F ("Source F") with interval from Source A, range 2-20, destination -> Queue_D
- JSON Patch: a single add op to /nodes/- with a DataSource node: { nodeId: "DataSource_F", displayName: "Source F", type: "DataSource", interval: <copied from A>, valueMin: 2, valueMax: 20, destinationNodeId: "Queue_D" }
- Validation checklist: confirm nodeId uniqueness, destination exists, schema fields present and valid.

Current scenario JSON (read-only context):
${JSON.stringify(scenarioContext.scenario, null, 2)}

Now, given the user request, produce the output in the exact format above.`;

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

    const chat = model.startChat({
      history: fullConversation.slice(0, -1), // All but the last message
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    
    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate response');
  }
}