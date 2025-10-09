import { NextRequest, NextResponse } from 'next/server';
import { PledStorageService } from '@/lib/pled-storage-service';

const pledStorage = new PledStorageService();

export async function GET(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const execution = await pledStorage.getExecution(params.executionId);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Format response
    const formattedExecution = {
      id: execution.id,
      templateId: execution.templateId,
      name: execution.name,
      description: execution.metadata?.description,
      scenario: execution.metadata?.scenario,
      nodeStates: execution.currentState?.nodeStates || {},
      currentTime: execution.currentState?.currentTime || 0,
      eventCounter: execution.currentState?.eventCounter || 0,
      globalActivityLog: execution.messages || [],
      nodeActivityLogs: execution.currentState?.nodeActivityLogs || {},
      isCompleted: execution.status === 'completed',
      createdAt: new Date(execution.startedAt).toISOString(),
      updatedAt: new Date(execution.updatedAt).toISOString(),
    };

    return NextResponse.json({ execution: formattedExecution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const updates = await request.json();

    // Update execution in cloud storage
    await pledStorage.updateExecution(params.executionId, {
      name: updates.name,
      status: updates.isCompleted ? 'completed' : 'active',
      currentState: {
        nodeStates: updates.nodeStates,
        currentTime: updates.currentTime,
        eventCounter: updates.eventCounter,
        nodeActivityLogs: updates.nodeActivityLogs,
      },
      messages: updates.globalActivityLog,
      metadata: {
        description: updates.description,
        scenario: updates.scenario,
      }
    });

    // Get updated execution
    const updatedExecution = await pledStorage.getExecution(params.executionId);

    if (!updatedExecution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Format response
    const formattedExecution = {
      id: updatedExecution.id,
      templateId: updatedExecution.templateId,
      name: updatedExecution.name,
      description: updatedExecution.metadata?.description,
      scenario: updatedExecution.metadata?.scenario,
      nodeStates: updatedExecution.currentState?.nodeStates || {},
      currentTime: updatedExecution.currentState?.currentTime || 0,
      eventCounter: updatedExecution.currentState?.eventCounter || 0,
      globalActivityLog: updatedExecution.messages || [],
      nodeActivityLogs: updatedExecution.currentState?.nodeActivityLogs || {},
      isCompleted: updatedExecution.status === 'completed',
      createdAt: new Date(updatedExecution.startedAt).toISOString(),
      updatedAt: new Date(updatedExecution.updatedAt).toISOString(),
    };

    return NextResponse.json({ execution: formattedExecution });
  } catch (error) {
    console.error('Error updating execution:', error);
    return NextResponse.json(
      { error: 'Failed to update execution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    await pledStorage.deleteExecution(params.executionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting execution:', error);
    return NextResponse.json(
      { error: 'Failed to delete execution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}