import { NextResponse } from 'next/server';
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

    // Update the instance with new data
    data.procedureInstances[instanceIndex] = {
      ...data.procedureInstances[instanceIndex],
      ...updates
    };

    await updateDb(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating procedure:', error);
    return NextResponse.json({ error: 'Failed to update procedure' }, { status: 500 });
  }
} 