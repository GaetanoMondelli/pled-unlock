import { NextRequest, NextResponse } from "next/server";
import { pledStorageService } from "@/lib/pled-storage-service";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
    .trim();
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("GET /api/admin/templates - Loading templates from PLED Storage service");

    // Initialize PLED storage if needed
    await pledStorageService.initializePledStorage();

    // Get templates from PLED storage service
    const templates = await pledStorageService.listTemplates();

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error loading templates:", error);

    // Check if it's a Firebase configuration issue
    if (error instanceof Error && (
      error.message.includes('FAILED_PRECONDITION') ||
      error.message.includes('Datastore Mode') ||
      error.message.includes('Firestore API is not available')
    )) {
      console.warn('Firebase Datastore Mode detected - templates unavailable');
      return NextResponse.json({
        templates: [],
        count: 0,
        warning: 'Template management unavailable - Firebase in Datastore Mode'
      });
    }

    return NextResponse.json(
      {
        error: "Failed to load templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, scenario, fromDefault } = body;

    console.log("POST /api/admin/templates - Creating template:", name);

    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    // Initialize PLED storage if needed
    await pledStorageService.initializePledStorage();

    let templateId: string;

    if (fromDefault) {
      // Create from default template
      const templates = await pledStorageService.listTemplates();
      const defaultTemplate = templates.find(t => t.isDefault);
      if (!defaultTemplate) {
        return NextResponse.json({ error: "No default template found" }, { status: 400 });
      }
      templateId = await pledStorageService.createTemplate({
        name,
        description,
        scenario: defaultTemplate.scenario,
        version: defaultTemplate.version,
        isDefault: false,
      });
    } else {
      // Create from provided scenario
      if (!scenario) {
        return NextResponse.json({ error: "Scenario is required when not creating from default" }, { status: 400 });
      }

      templateId = await pledStorageService.createTemplate({
        name,
        description,
        scenario,
        version: scenario.version || '3.0',
      });
    }

    const template = await pledStorageService.getTemplate(templateId);

    return NextResponse.json({
      success: true,
      template,
      templateId,
      slug: slugify(name),
      message: `Template "${name}" created successfully`,
    });
  } catch (error) {
    console.error("Error creating template:", error);

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
        error: "Failed to create template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}