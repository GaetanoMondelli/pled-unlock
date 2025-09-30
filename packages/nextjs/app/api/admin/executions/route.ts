import { NextRequest, NextResponse } from "next/server";
import { dataService } from "@/lib/platform/dataService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId') || undefined;
    console.log("GET /api/admin/executions - listing", templateId ? `for template ${templateId}` : 'all');

    const executions = await dataService.listExecutions(templateId || undefined);

    return NextResponse.json({
      executions,
      count: executions.length,
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
    const { templateId, name, description, scenario, nodeStates, currentTime, eventCounter, globalActivityLog, nodeActivityLogs, isCompleted } = body;

    console.log("POST /api/admin/executions - creating execution for template", templateId);

    if (!templateId || !name || !scenario) {
      return NextResponse.json(
        { error: "templateId, name and scenario are required" },
        { status: 400 }
      );
    }

    const executionId = await dataService.createExecution({
      templateId,
      name,
      description,
      scenario,
      nodeStates: nodeStates ?? {},
      currentTime: currentTime ?? 0,
      eventCounter: eventCounter ?? 0,
      globalActivityLog: globalActivityLog ?? [],
      nodeActivityLogs: nodeActivityLogs ?? {},
      isCompleted: !!isCompleted,
    });

    const execution = await dataService.getExecution(executionId);

    return NextResponse.json({
      success: true,
      execution,
      message: `Execution "${name}" saved successfully`,
    });
  } catch (error) {
    console.error("Error in execution saving route:", error);
    return NextResponse.json(
      {
        error: "Failed to save execution",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}