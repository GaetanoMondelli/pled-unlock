import { NextRequest, NextResponse } from "next/server";
import { dataService } from "@/lib/platform/dataService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { templateId } = params;
    console.log(`GET /api/admin/templates/${templateId} - Loading template`);

    const template = await dataService.getTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error loading template:", error);
    return NextResponse.json(
      {
        error: "Failed to load template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { templateId } = params;
    const body = await request.json();
    console.log(`PUT /api/admin/templates/${templateId} - Updating template`);

    await dataService.updateTemplate(templateId, body);
    const template = await dataService.getTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${template.name}" updated successfully`,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      {
        error: "Failed to update template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { templateId } = params;
    console.log(`DELETE /api/admin/templates/${templateId} - Deleting template`);

    await dataService.deleteTemplate(templateId);

    return NextResponse.json({
      success: true,
      message: `Template deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      {
        error: "Failed to delete template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}