import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Event } from '../../../types/events';
import { matchEventToRule } from '../../../utils/eventMatching';

const PLED_PATH = path.join(process.cwd(), 'public', 'pled.json');

export async function GET() {
  try {
    const pledContent = await fs.readFile(PLED_PATH, 'utf8');
    const pled = JSON.parse(pledContent);
    
    return NextResponse.json({
      events: pled.events,
      receivedEvents: pled.receivedEvents
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

    const pledPath = path.join(process.cwd(), "public", "pled.json");
    const pledData = JSON.parse(await fs.readFile(pledPath, "utf-8"));

    if (action === 'add_template') {
      // Initialize events if doesn't exist
      if (!pledData.events) {
        pledData.events = {};
      }

      // Create event key
      const eventKey = event.type === 'DOCUSIGN_EVENT' 
        ? `docusign_${event.id}`
        : `${event.type.toLowerCase()}_${Date.now()}`;

      // Add event to events object
      pledData.events[eventKey] = {
        id: eventKey,
        name: event.name || `${event.type} Event`,
        description: event.description || `${event.type} event created at ${new Date().toISOString()}`,
        type: event.type,
        template: event.template,
        received: false
      };

      // Write updated data back to file
      await fs.writeFile(pledPath, JSON.stringify(pledData, null, 2));
      console.log('Added event:', pledData.events[eventKey]);

      return NextResponse.json({ 
        success: true,
        event: pledData.events[eventKey]
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
    const pledPath = path.join(process.cwd(), "public", "pled.json");
    const pledData = JSON.parse(await fs.readFile(pledPath, "utf-8"));

    // Remove event from events object
    if (pledData.events[eventId]) {
      delete pledData.events[eventId];
    }

    // Write updated data back to file
    await fs.writeFile(pledPath, JSON.stringify(pledData, null, 2));

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