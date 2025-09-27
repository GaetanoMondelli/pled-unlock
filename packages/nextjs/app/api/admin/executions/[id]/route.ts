import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/lib/firestore-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const execution = await firestoreService.getExecution(params.id);

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error("Error fetching execution:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch execution",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      nodeStates,
      currentTime,
      eventCounter,
      globalActivityLog,
      nodeActivityLogs,
      isCompleted,
    } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (nodeStates) updates.nodeStates = nodeStates;
    if (currentTime !== undefined) updates.currentTime = currentTime;
    if (eventCounter !== undefined) updates.eventCounter = eventCounter;
    if (globalActivityLog) updates.globalActivityLog = globalActivityLog;
    if (nodeActivityLogs) updates.nodeActivityLogs = nodeActivityLogs;
    if (isCompleted !== undefined) updates.isCompleted = isCompleted;

    await firestoreService.updateExecution(params.id, updates);

    const execution = await firestoreService.getExecution(params.id);

    return NextResponse.json({
      success: true,
      execution,
      message: "Execution updated successfully",
    });
  } catch (error) {
    console.error("Error updating execution:", error);
    return NextResponse.json(
      {
        error: "Failed to update execution",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await firestoreService.deleteExecution(params.id);

    return NextResponse.json({
      success: true,
      message: "Execution deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting execution:", error);
    return NextResponse.json(
      {
        error: "Failed to delete execution",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}