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
    const { event, action } = await request.json();
    console.log('Received request:', { action, event });

    const data = await fetchFromDb();

    if (action === 'add_template') {
      if (!data.events) {
        data.events = {};
      }

      const eventKey = event.type === 'DOCUSIGN_EVENT' 
        ? `docusign_${event.id}`
        : `${event.type.toLowerCase()}_${Date.now()}`;

      data.events[eventKey] = {
        id: eventKey,
        name: event.name || `${event.type} Event`,
        description: event.description || `${event.type} event created at ${new Date().toISOString()}`,
        type: event.type,
        template: event.template,
        received: false
      };

      await updateDb(data);
      console.log('Added event:', data.events[eventKey]);

      return NextResponse.json({ 
        success: true,
        event: data.events[eventKey]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding event:", error);
    return NextResponse.json({ error: "Failed to add event" }, { status: 500 });
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