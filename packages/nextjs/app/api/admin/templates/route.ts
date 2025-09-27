import { NextRequest, NextResponse } from "next/server";
import { fileTemplateService } from "@/lib/file-template-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("GET /api/admin/templates - Loading templates from file system");

    const templates = await fileTemplateService.getTemplates();

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error loading templates:", error);
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

    let templateId: string;

    if (fromDefault) {
      // Create from default template
      templateId = await fileTemplateService.createTemplateFromDefault(name, description);
    } else {
      // Create from provided scenario
      if (!scenario) {
        return NextResponse.json({ error: "Scenario is required when not creating from default" }, { status: 400 });
      }

      templateId = await fileTemplateService.createTemplate({
        name,
        description,
        scenario,
        version: scenario.version || '3.0',
      });
    }

    const template = await fileTemplateService.getTemplate(templateId);

    return NextResponse.json({
      success: true,
      template,
      templateId,
      slug: fileTemplateService.getTemplateSlug(name),
      message: `Template "${name}" created successfully`,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      {
        error: "Failed to create template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}