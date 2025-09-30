import { NextRequest, NextResponse } from "next/server";
import { dataService } from "@/lib/platform/dataService";

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
    console.log("GET /api/admin/templates - Loading templates from dataService (adapter-backed)");

    const templates = await dataService.listTemplates();

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
      // Create from default template (look for isDefault=true)
      const templates = await dataService.listTemplates();
      const defaultTemplate = templates.find(t => t.isDefault);
      if (!defaultTemplate) {
        return NextResponse.json({ error: "No default template found" }, { status: 400 });
      }
      templateId = await dataService.createTemplate({
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

      templateId = await dataService.createTemplate({
        name,
        description,
        scenario,
        version: scenario.version || '3.0',
      });
    }

    const template = await dataService.getTemplate(templateId);

    return NextResponse.json({
      success: true,
      template,
      templateId,
      slug: slugify(name),
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