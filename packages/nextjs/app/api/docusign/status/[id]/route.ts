import { NextResponse } from "next/server";
import { docusignClient } from "../../../../../utils/docusign/docusignClient";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const status = await docusignClient.getEnvelopeStatus(params.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching envelope status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
} 