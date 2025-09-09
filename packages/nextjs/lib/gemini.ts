import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ 
  model: "gemini-pro",
  generationConfig: {
    temperature: 0.7,
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
    const contextPrompt = `You are an AI assistant helping with scenario editing and template configuration. 
    
Current scenario context:
- Current simulation time: ${scenarioContext.currentTime}s
- Simulation running: ${scenarioContext.isRunning}
- Errors: ${scenarioContext.errors.length > 0 ? scenarioContext.errors.join(', ') : 'None'}
- Scenario structure: ${JSON.stringify(scenarioContext.scenario, null, 2).slice(0, 500)}...

You should help users:
1. Understand and debug scenario configurations
2. Suggest improvements to the scenario structure
3. Help fix simulation errors
4. Explain how different parts of the scenario work
5. Provide code suggestions and optimizations

Keep responses concise but helpful. Focus on actionable advice.`;

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