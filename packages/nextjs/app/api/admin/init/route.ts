import { NextRequest, NextResponse } from "next/server";
import { dataService } from "@/lib/platform/dataService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Ensure at least one default template exists
    const templates = await dataService.listTemplates();
    const hasDefault = templates.some(t => t.isDefault);
    if (!hasDefault) {
      // Create a minimal default template if none is present
      const defaultId = await dataService.createTemplate({
        name: 'Default Template',
        description: 'Default simulation template',
        scenario: { version: '3.0', nodes: [] } as any,
        version: '3.0',
        isDefault: true,
      } as any);
      console.log('Created default template with id', defaultId);
    }

    return NextResponse.json({
      success: true,
      message: "Admin structure initialized successfully",
    });
  } catch (error) {
    console.error("Error initializing admin structure:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize admin structure",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}