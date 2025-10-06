import { NextRequest, NextResponse } from "next/server";
import { pledStorageService } from "@/lib/firebase/pled-storage-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log("POST /api/admin/pled/init - Initializing PLED Firebase collection");

    // Check Firebase connection first
    const isConnected = await pledStorageService.checkConnection();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase connection failed",
          details: "Unable to connect to Firebase. Please check your configuration.",
        },
        { status: 503 }
      );
    }

    // Initialize PLED storage
    await pledStorageService.initializePledStorage();

    // Verify initialization by listing templates
    const templates = await pledStorageService.listTemplates();

    return NextResponse.json({
      success: true,
      message: "PLED Firebase collection initialized successfully",
      details: {
        connected: true,
        templatesCount: templates.length,
        defaultTemplateCreated: templates.some(t => t.isDefault),
        storageStructure: {
          folder: "pled",
          subfolders: ["templates", "executions"],
          manifest: "manifest.json"
        }
      },
    });

  } catch (error) {
    console.error("Error initializing PLED Firebase collection:", error);

    // Check if it's a Firebase configuration issue
    if (error instanceof Error && (
      error.message.includes('FAILED_PRECONDITION') ||
      error.message.includes('Datastore Mode') ||
      error.message.includes('Firestore API is not available')
    )) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase configuration issue",
          details: "Your Firebase project configuration issue. Please check Firebase Storage access.",
          recommendations: [
            "Go to https://console.firebase.google.com",
            "Select your project",
            "Go to Storage",
            "Check Storage rules and permissions",
            "Verify Storage bucket is configured"
          ]
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize PLED collection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log("GET /api/admin/pled/init - Checking PLED Firebase status");

    // Check Firebase connection
    const isConnected = await pledStorageService.checkConnection();

    if (!isConnected) {
      return NextResponse.json({
        initialized: false,
        connected: false,
        error: "Firebase connection failed"
      });
    }

    // Check if PLED collection exists and has templates
    const templates = await pledStorageService.listTemplates();

    return NextResponse.json({
      initialized: true,
      connected: true,
      templatesCount: templates.length,
      hasDefaultTemplate: templates.some(t => t.isDefault),
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        version: t.version,
        isDefault: t.isDefault,
        createdAt: t.createdAt
      }))
    });

  } catch (error) {
    console.error("Error checking PLED Firebase status:", error);

    // Check if it's a Firebase configuration issue
    if (error instanceof Error && (
      error.message.includes('FAILED_PRECONDITION') ||
      error.message.includes('Datastore Mode') ||
      error.message.includes('Firestore API is not available')
    )) {
      return NextResponse.json({
        initialized: false,
        connected: false,
        error: "Firebase Storage access issue",
        details: "Please check Firebase Storage configuration"
      });
    }

    return NextResponse.json({
      initialized: false,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}