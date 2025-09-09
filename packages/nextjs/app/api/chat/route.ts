import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, type ChatMessage, type ScenarioContext } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, scenarioContext }: { 
      messages: ChatMessage[], 
      scenarioContext: ScenarioContext 
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!scenarioContext) {
      return NextResponse.json(
        { error: 'Scenario context is required' },
        { status: 400 }
      );
    }

    const response = await generateResponse(messages, scenarioContext);

    return NextResponse.json({
      message: response,
      success: true
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate response', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Chat API is running',
    endpoints: {
      POST: '/api/chat - Send messages to the AI assistant'
    }
  });
}