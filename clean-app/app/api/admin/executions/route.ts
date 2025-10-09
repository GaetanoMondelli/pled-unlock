import { NextRequest, NextResponse } from 'next/server';
import { PledStorageService } from '@/lib/pled-storage-service';
import type { EventSourcedExecution } from '@/lib/types/events';
import { EventSource } from '@/lib/types/events';

const pledStorage = new PledStorageService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('templateId');

    const executions = await pledStorage.listExecutions(templateId || undefined);

    // Convert PledExecution format to EventSourcedExecution if needed
    const formattedExecutions = executions.map(exec => ({
      id: exec.id,
      templateId: exec.templateId,
      name: exec.name,
      description: exec.metadata?.description,
      externalEvents: exec.events?.filter((e: any) => e.source === EventSource.EXTERNAL) || [],
      internalEvents: exec.events?.filter((e: any) => e.source === EventSource.INTERNAL) || [],
      eventSequence: exec.events?.map((e: any) => e.id) || [],
      nodeStates: exec.currentState?.nodeStates || {},
      currentTime: exec.currentState?.currentTime || 0,
      eventCounter: exec.currentState?.eventCounter || 0,
      globalActivityLog: exec.messages || [],
      nodeActivityLogs: exec.currentState?.nodeActivityLogs || {},
      isCompleted: exec.status === 'completed',
      createdAt: new Date(exec.startedAt).toISOString(),
      updatedAt: new Date(exec.updatedAt).toISOString(),
      completedAt: exec.completedAt ? new Date(exec.completedAt).toISOString() : undefined,
      replayable: true,
    }));

    return NextResponse.json({ executions: formattedExecutions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Separate events by type
    const externalEvents = [];
    const internalEvents = [];

    // Process activity log to identify external vs internal events
    if (body.globalActivityLog) {
      body.globalActivityLog.forEach((activity: any) => {
        // User-initiated actions are external events
        if (activity.action === 'USER_START' ||
            activity.action === 'USER_STOP' ||
            activity.action === 'USER_RESET' ||
            activity.details?.includes('User')) {
          externalEvents.push({
            id: `ext_${activity.sequence}_${Date.now()}`,
            timestamp: activity.timestamp,
            source: EventSource.EXTERNAL,
            origin: 'USER',
            nodeId: activity.nodeId,
            type: activity.action,
            sequence: activity.sequence,
            originalPayload: activity
          });
        }
      });
    }

    // Create execution in cloud storage
    const executionId = await pledStorage.createExecution({
      templateId: body.templateId,
      name: body.name,
      status: body.isCompleted ? 'completed' : 'active',
      currentState: {
        nodeStates: body.nodeStates,
        currentTime: body.currentTime,
        eventCounter: body.eventCounter,
        nodeActivityLogs: body.nodeActivityLogs,
      },
      events: [...externalEvents, ...internalEvents],
      messages: body.globalActivityLog || [],
      metadata: {
        description: body.description,
        scenario: body.scenario,
        replayable: true,
      }
    });

    // Get the created execution
    const savedExecution = await pledStorage.getExecution(executionId);

    // Format response
    const formattedExecution = {
      id: savedExecution.id,
      templateId: savedExecution.templateId,
      name: savedExecution.name,
      description: savedExecution.metadata?.description,
      scenario: savedExecution.metadata?.scenario,
      nodeStates: savedExecution.currentState?.nodeStates || {},
      currentTime: savedExecution.currentState?.currentTime || 0,
      eventCounter: savedExecution.currentState?.eventCounter || 0,
      globalActivityLog: savedExecution.messages || [],
      nodeActivityLogs: savedExecution.currentState?.nodeActivityLogs || {},
      isCompleted: savedExecution.status === 'completed',
      createdAt: new Date(savedExecution.startedAt).toISOString(),
      updatedAt: new Date(savedExecution.updatedAt).toISOString(),
    };

    return NextResponse.json({ execution: formattedExecution });
  } catch (error) {
    console.error('Error saving execution:', error);
    return NextResponse.json(
      { error: 'Failed to save execution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}