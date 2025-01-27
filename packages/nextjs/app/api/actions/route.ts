import { NextResponse } from "next/server";
import { fetchFromDb, updateDb } from "@/utils/api";

export async function POST(request: Request) {
  try {
    const { action, procedureId, triggerState, event } = await request.json();
    const data = await fetchFromDb();

    // Find template
    const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
    const template = data.procedureTemplates?.find((t: any) => t.templateId === instance?.templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Initialize actions object if it doesn't exist
    if (!template.actions) {
      template.actions = {};
    }

    // Initialize array for this state if it doesn't exist
    if (!template.actions[triggerState]) {
      template.actions[triggerState] = [];
    }

    // Add new action
    template.actions[triggerState].push(event);

    // Update the database using the utility function
    await updateDb(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling action:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to handle action",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { procedureId, state, actionId } = await request.json();
    const data = await fetchFromDb();

    // Find template
    const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
    const template = data.procedureTemplates?.find((t: any) => t.templateId === instance?.templateId);

    if (!template || !template.actions?.[state]) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Filter out the action to delete
    template.actions[state] = template.actions[state].filter((action: any) => action.id !== actionId);

    // Remove the state if it has no more actions
    if (template.actions[state].length === 0) {
      delete template.actions[state];
    }

    // Update the database
    await updateDb(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting action:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete action",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { procedureId, state, actionId, updates } = await request.json();
    const data = await fetchFromDb();

    const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
    const template = data.procedureTemplates?.find((t: any) => t.templateId === instance?.templateId);

    if (!template?.actions?.[state]) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Update the specific action
    template.actions[state] = template.actions[state].map((action: any) =>
      action.id === actionId ? { ...action, ...updates } : action,
    );

    await updateDb(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating action:", error);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}
