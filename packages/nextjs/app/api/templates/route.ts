import { NextRequest, NextResponse } from 'next/server';
import { bucket } from '@/app/lib/firebase';

export const dynamic = 'force-dynamic';

const filePath = 'pled.json';

export async function POST(request: NextRequest) {
  try {
    const { templates } = await request.json();
    
    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json(
        { error: 'Invalid request: templates array is required' },
        { status: 400 }
      );
    }

    // Get current data from Firebase Storage
    const file = bucket.file(filePath);
    const [fileContents] = await file.download();
    const currentData = JSON.parse(fileContents.toString());
    
    // Add new templates to existing ones
    const updatedData = {
      ...currentData,
      procedureTemplates: [
        ...(currentData.procedureTemplates || []),
        ...templates
      ]
    };

    // Save back to Firebase Storage
    await file.save(JSON.stringify(updatedData, null, 2), {
      contentType: 'application/json',
    });

    return NextResponse.json({
      success: true,
      message: `Added ${templates.length} templates successfully`,
      addedTemplates: templates.map((t: any) => ({ id: t.templateId, name: t.name }))
    });

  } catch (error) {
    console.error('Error adding templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const file = bucket.file(filePath);
    const [fileContents] = await file.download();
    const data = JSON.parse(fileContents.toString());
    
    return NextResponse.json({
      templates: data.procedureTemplates || [],
      count: (data.procedureTemplates || []).length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}