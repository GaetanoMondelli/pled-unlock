import { NextRequest, NextResponse } from "next/server";
import { pledStorageService } from "@/lib/firebase/pled-storage-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { templates } = await request.json();

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json({ error: "Invalid request: templates array is required" }, { status: 400 });
    }

    console.log("POST /api/templates - Adding templates to PLED service");

    // Initialize PLED collection if needed
    await pledStorageService.initializePledStorage();

    const addedTemplates = [];
    for (const templateData of templates) {
      try {
        const templateId = await pledStorageService.createTemplate({
          name: templateData.name,
          description: templateData.description,
          scenario: templateData.scenario,
          version: templateData.version || '1.0',
        });
        addedTemplates.push({ id: templateId, name: templateData.name });
      } catch (error) {
        console.error(`Failed to add template ${templateData.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${addedTemplates.length} templates successfully`,
      addedTemplates,
    });
  } catch (error) {
    console.error("Error adding templates:", error);

    // Check if it's a Firebase configuration issue
    if (error instanceof Error && (
      error.message.includes('FAILED_PRECONDITION') ||
      error.message.includes('Datastore Mode') ||
      error.message.includes('Firestore API is not available')
    )) {
      return NextResponse.json(
        {
          error: "Template management unavailable",
          details: "Firebase in Datastore Mode - template features disabled",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to add templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    console.log("GET /api/templates - Loading procedure templates from PLED service");

    // Initialize PLED collection if needed
    await pledStorageService.initializePledStorage();

    // Get templates from PLED service
    const pledTemplates = await pledStorageService.listTemplates();

    // Convert to procedure templates format for compatibility
    const procedureTemplates = pledTemplates.map(template => ({
      templateId: template.id,
      name: template.name,
      description: template.description,
      scenario: template.scenario,
      version: template.version,
      createdAt: template.createdAt,
    }));

    return NextResponse.json({
      templates: procedureTemplates,
      count: procedureTemplates.length,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);

    // Check if it's a Firebase configuration issue
    if (error instanceof Error && (
      error.message.includes('FAILED_PRECONDITION') ||
      error.message.includes('Datastore Mode') ||
      error.message.includes('Firestore API is not available')
    )) {
      console.warn('Firebase Datastore Mode detected - returning empty templates');
      return NextResponse.json({
        templates: [],
        count: 0,
        warning: 'Template management unavailable - Firebase in Datastore Mode'
      });
    }

    return NextResponse.json(
      {
        error: "Failed to fetch templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
