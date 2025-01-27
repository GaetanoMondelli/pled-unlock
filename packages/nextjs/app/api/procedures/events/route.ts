import { NextResponse } from "next/server";
import { fetchFromDb, updateDb } from "../../../../utils/api";

export async function POST(request: Request) {
  try {
    const { event, procedureId } = await request.json();
    console.log("Creating procedure event:", { type: event.type, procedureId });

    // Get fresh data before update
    const data = await fetchFromDb();

    // Find the correct procedure instance
    const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);

    if (!instance) {
      throw new Error(`Procedure instance not found for ID: ${procedureId}`);
    }

    // Initialize history if it doesn't exist
    if (!instance.history) {
      instance.history = { events: [], messages: [] };
    }

    // Create new event
    const newEvent = {
      id: `evt_${Date.now()}`,
      type: event.type,
      timestamp: new Date().toISOString(),
      template: {
        source: "automatic",
        data: event,
        history: {
          events: [...instance.history.events],
        },
      },
    };

    console.log("newEvent", newEvent);

    // Create new instance with updated history
    const updatedInstance = {
      ...instance,
      history: {
        ...instance.history,
        events: [...instance.history.events, newEvent],
      },
    };

    // Create new data object with updated instances
    const newData = {
      ...data,
      procedureInstances: [
        ...data.procedureInstances.filter((p: any) => p.instanceId !== procedureId),
        updatedInstance,
      ],
    };

    // Update the database with complete new state
    await updateDb(newData);

    return NextResponse.json({
      success: true,
      event: event,
    });
  } catch (error) {
    console.error("Error adding procedure event:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add event",
      },
      { status: 500 },
    );
  }
}
