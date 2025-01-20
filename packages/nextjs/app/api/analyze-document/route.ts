import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Mock response - always return the same FSM definition and message rules
    const mockResponse = {
      fsm: `
        idle 'start' -> review;
        review 'approve' -> approved;
        review 'reject' -> rejected;
        approved 'complete' -> completed;
        rejected 'retry' -> review;
        completed 'archive' -> archived;
      `.trim(),
      messageRules: JSON.stringify([
        {
          "event": "start",
          "message": "Process started",
          "when": "state === 'idle'"
        },
        {
          "event": "approve",
          "message": "Document approved",
          "when": "state === 'review'"
        },
        {
          "event": "reject",
          "message": "Document rejected",
          "when": "state === 'review'"
        },
        {
          "event": "complete",
          "message": "Process completed",
          "when": "state === 'approved'"
        },
        {
          "event": "retry",
          "message": "Document sent back for review",
          "when": "state === 'rejected'"
        },
        {
          "event": "archive",
          "message": "Document archived",
          "when": "state === 'completed'"
        }
      ], null, 2)
    }

    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error('Error analyzing document:', error)
    return NextResponse.json(
      { error: 'Failed to analyze document' },
      { status: 500 }
    )
  }
} 