import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/lib/firestore-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await firestoreService.initializeDefaultTemplate();

    return NextResponse.json({
      success: true,
      message: "Admin structure initialized successfully",
    });
  } catch (error) {
    console.error("Error initializing admin structure:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize admin structure",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}