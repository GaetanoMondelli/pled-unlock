import { NextRequest, NextResponse } from "next/server";
import { PledStorageService } from "@/lib/pled-storage-service";

const storageService = new PledStorageService();

export async function GET(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const scenario = await storageService.getTemplate(params.scenarioId);

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    await storageService.deleteTemplate(params.scenarioId);

    return NextResponse.json({ success: true, id: params.scenarioId });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const data = await request.json();

    const updatedScenario = {
      ...data,
      id: params.scenarioId,
      updatedAt: Date.now(),
    };

    const result = await storageService.updateTemplate(params.scenarioId, updatedScenario);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating scenario:", error);
    return NextResponse.json(
      { error: "Failed to update scenario", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}