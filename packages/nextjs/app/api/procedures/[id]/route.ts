import { NextRequest, NextResponse } from 'next/server';
import { fetchFromDb, updateDb } from '@/utils/api';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const data = await fetchFromDb();
    
    // Find and update the instance
    const instanceIndex = data.procedureInstances.findIndex(
      (p: any) => p.instanceId === params.id
    );
    
    if (instanceIndex === -1) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const instance = data.procedureInstances[instanceIndex];

    // Initialize history if needed
    if (!instance.history) {
      instance.history = { events: [], messages: [], executedActions: [] };
    }

    // Handle both events and actions in one update
    if (updates.event) {
      // Add new event
      const newEvent = {
        id: `evt_${Date.now()}`,
        type: updates.event.type,
        timestamp: new Date().toISOString(),
        event: updates.event
      };
      instance.history.events.push(newEvent);
    }

    if (updates.action) {
      // Add executed action
      instance.history.executedActions.push({
        actionId: updates.action.actionId,
        state: updates.action.state,
        type: updates.action.type,
        trigger: updates.action.trigger || 'INIT',
        timestamp: new Date().toISOString()
      });
    }

    // Create new data object with updated instance
    const newData = {
      ...data,
      procedureInstances: [
        ...data.procedureInstances.slice(0, instanceIndex),
        instance,
        ...data.procedureInstances.slice(instanceIndex + 1)
      ]
    };

    // Single update to Firebase
    await updateDb(newData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating procedure:', error);
    return NextResponse.json({ error: 'Failed to update procedure' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const procedureId = params.id;
    const eventData = await req.json();
    const data = await fetchFromDb();

    console.log('Creating event:', eventData); // Debug log

    // Find the procedure instance
    const instance = data.procedureInstances?.find(
      (p: any) => p.instanceId === procedureId
    );

    if (!instance) {
      return NextResponse.json(
        { error: 'Procedure not found' },
        { status: 404 }
      );
    }

    // Initialize events array if it doesn't exist
    if (!instance.events) {
      instance.events = [];
    }

    // Create new event with proper structure
    const newEvent = {
      id: `evt_${Date.now()}`,
      type: eventData.type,
      data: eventData.data,
      timestamp: eventData.timestamp || new Date().toISOString(),
      title: eventData.title,
      content: eventData.content,
      source: eventData.source
    };

    console.log('New event:', newEvent); // Debug log

    // Add event to instance
    instance.events.push(newEvent);

    // Save updated data to database
    await updateDb(data);

    return NextResponse.json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
} 