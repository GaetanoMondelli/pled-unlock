import { NextRequest, NextResponse } from "next/server";
import { PledStorageService } from "@/lib/pled-storage-service";

const storageService = new PledStorageService();

export async function GET(request: NextRequest) {
  try {
    const scenarios = await storageService.listTemplates();
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error("Error listing scenarios:", error);
    return NextResponse.json(
      { error: "Failed to list scenarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Ensure the scenario has the right structure
    const scenarioToSave = {
      id: data.id || `scenario-${Date.now()}`,
      name: data.name,
      description: data.description,
      scenario: data.scenario || { nodes: data.nodes, edges: data.edges },
      version: data.version || "1.0.0",
      isDefault: data.isDefault || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: data.metadata || {},
      tags: data.tags || (data.metadata?.tags) || [],
    };

    const templateId = await storageService.createTemplate(scenarioToSave);

    return NextResponse.json({ ...scenarioToSave, id: templateId });
  } catch (error) {
    console.error("Error saving scenario:", error);
    return NextResponse.json(
      { error: "Failed to save scenario", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}