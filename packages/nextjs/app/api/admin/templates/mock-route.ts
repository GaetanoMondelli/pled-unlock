// Temporary mock implementation for testing when Firebase isn't available
import { NextRequest, NextResponse } from "next/server";
import type { TemplateDocument } from "@/lib/firestore-service";

export const dynamic = "force-dynamic";

// Mock data for testing
const mockTemplates: TemplateDocument[] = [
  {
    id: "default-template-1",
    name: "Default Template",
    description: "Basic source-sink template for testing",
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: "3.0",
    scenario: {
      version: "3.0",
      nodes: [
        {
          nodeId: "source1",
          type: "DataSource",
          displayName: "Token Source",
          position: { x: 100, y: 100 },
          interval: 5,
          generation: {
            type: "random",
            valueMin: 1,
            valueMax: 10,
          },
          outputs: [{
            destinationNodeId: "sink1",
          }],
        },
        {
          nodeId: "sink1",
          type: "Sink",
          displayName: "Token Sink",
          position: { x: 400, y: 100 },
          inputs: [{
            nodeId: "source1",
          }],
        },
      ],
    },
  },
];

export async function GET() {
  try {
    console.log("Using mock template data");
    return NextResponse.json({
      templates: mockTemplates,
      count: mockTemplates.length,
    });
  } catch (error) {
    console.error("Mock template error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch mock templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    const newTemplate: TemplateDocument = {
      id: `template-${Date.now()}`,
      name: name || "New Template",
      description,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: "3.0",
      scenario: mockTemplates[0].scenario, // Copy default scenario
    };

    mockTemplates.push(newTemplate);

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: `Template "${name}" created successfully`,
    });
  } catch (error) {
    console.error("Mock template creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create mock template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}