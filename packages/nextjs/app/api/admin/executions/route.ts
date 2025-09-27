import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/lib/firestore-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/admin/executions - Execution management temporarily disabled");

    // Return empty executions for now due to Firebase Datastore/Firestore mode conflict
    return NextResponse.json({
      executions: [],
      count: 0,
      warning: "Execution management temporarily disabled due to Firebase configuration",
    });
  } catch (error) {
    console.error("Error in executions route:", error);
    return NextResponse.json(
      {
        error: "Executions route error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, name, description } = body;

    console.log("POST /api/admin/executions - Execution saving temporarily disabled");

    if (!templateId || !name) {
      return NextResponse.json(
        { error: "Template ID and execution name are required" },
        { status: 400 }
      );
    }

    // Return a mock success response for now due to Firebase Datastore/Firestore mode conflict
    const mockExecution = {
      id: `mock-execution-${Date.now()}`,
      templateId,
      name,
      description: description || "Mock execution (Firebase disabled)",
      scenario: { version: "3.0", nodes: [] },
      nodeStates: {},
      currentTime: 0,
      eventCounter: 0,
      globalActivityLog: [],
      nodeActivityLogs: {},
      startedAt: Date.now(),
      lastSavedAt: Date.now(),
      isCompleted: false,
    };

    return NextResponse.json({
      success: true,
      execution: mockExecution,
      message: `Execution "${name}" saved successfully (mock - Firebase disabled)`,
      warning: "Execution management temporarily disabled due to Firebase configuration",
    });
  } catch (error) {
    console.error("Error in execution saving route:", error);
    return NextResponse.json(
      {
        error: "Execution saving temporarily disabled",
        details: "Firebase configuration issue - using mock response",
      },
      { status: 200 }, // Return 200 to prevent UI errors
    );
  }
}