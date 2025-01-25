import { NextResponse } from 'next/server';
import { fetchFromDb, updateDb } from '../../../utils/api';

export async function GET() {
  try {
    const data = await fetchFromDb();
    return NextResponse.json({
      events: data.events,
      receivedEvents: data.receivedEvents
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { event, action, procedureId } = await request.json();
    console.log('Creating event:', { type: event.type, procedureId });

    const data = await fetchFromDb();
    console.log('Current DB data:', data);

    if (action === 'add_template') {
      // Initialize eventTemplates if it doesn't exist
      if (!data.eventTemplates) {
        data.eventTemplates = {};
      }

      // Add the new event template
      const templateId = `${event.type.toLowerCase()}_${Date.now()}`;
      data.eventTemplates[templateId] = {
        id: templateId,
        name: event.name,
        description: event.description,
        type: event.type,
        template: event.template,
        received: false
      };

      // Update the database
      await updateDb(data);

      return NextResponse.json({ 
        success: true,
        event: data.eventTemplates[templateId]
      });
    } else {
      // Handle adding event to procedure instance
      if (!data.procedureInstances) {
        data.procedureInstances = [];
      }

      // Find the correct procedure instance
      const instance = data.procedureInstances.find((p: any) => p.instanceId === procedureId);
      console.log('Found instance:', instance);
      console.log('Looking for procedureId:', procedureId);
      
      if (!instance) {
        throw new Error(`Procedure instance not found for ID: ${procedureId}`);
      }

      // Initialize history if it doesn't exist
      if (!instance.history) {
        instance.history = { events: [], messages: [] };
      }

      // Add the new event to history
      instance.history.events.push({
        id: event.id,
        type: event.type,
        timestamp: new Date().toISOString(),
        data: event.template.data
      });

      // Update the database
      await updateDb(data);

      return NextResponse.json({ 
        success: true,
        event: event
      });
    }
  } catch (error) {
    console.error("Error adding event:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to add event" 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { eventId } = await request.json();
    const data = await fetchFromDb();

    if (data.events[eventId]) {
      delete data.events[eventId];
    }

    await updateDb(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

// Helper function to interpolate variables in templates
function interpolateTemplate(template: string, variables: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = path.split('.')
      .reduce((obj: any, key: string) => obj?.[key], variables);
    return value ?? match;
  });
} 