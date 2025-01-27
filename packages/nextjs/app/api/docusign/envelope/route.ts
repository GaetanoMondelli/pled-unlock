import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic'; // Mark route as dynamic

const BASE_URL = "https://demo.docusign.net/restapi/v2.1";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    console.log("we got inside the post");

    // Get file from form data
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get other data
    const recipients = JSON.parse(formData.get("recipients") as string);
    const tabPositions = JSON.parse(formData.get("tabPositions") as string);

    // Get auth headers using headers() API
    const headersList = headers();
    const accessToken = headersList.get("Authorization");
    const accountId = headersList.get("Account-Id");
    const baseUrl = headersList.get("Base-Url");

    // Add debug logs
    console.log("Headers:", {
      auth: accessToken,
      accountId: accountId,
    });

    if (!accessToken || !accountId) {
      console.log("Missing auth:", { accessToken, accountId, baseUrl }); // Debug log
      return NextResponse.json(
        { error: "Missing authentication headers" },
        { status: 403 },
      );
    }

    // Convert file to base64 for DocuSign
    const arrayBuffer = await file.arrayBuffer();
    const fileBase64 = Buffer.from(arrayBuffer).toString("base64");

    // Create envelope definition
    const envelope = {
      emailSubject: "Please sign this document",
      emailBlurb: "Please review and sign this document at your earliest convenience.",
      documents: [
        {
          documentBase64: fileBase64,
          name: file.name,
          fileExtension: file.name.split(".").pop(),
          documentId: "1",
          transformPdfFields: true,
        },
      ],
      recipients: {
        signers: recipients.map((email: string, index: number) => ({
          email,
          name: `Recipient ${index + 1}`,
          recipientId: (index + 1).toString(),
          routingOrder: (index + 1).toString(),
          tabs: {
            signHereTabs: tabPositions.map((tab: any) => ({
              ...tab,
              documentId: "1",
              recipientId: (index + 1).toString(),
            })),
          },
        })),
      },
      status: "sent",
    };

    // Call DocuSign API directly
    const response = await fetch(`${BASE_URL}/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelope),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create envelope");
    }

    const result = await response.json();
    return NextResponse.json({
      envelopeId: result.envelopeId,
      status: result.status,
      message: "Envelope created successfully",
    });
  } catch (error: any) {
    console.error("Create envelope error:", error);
    return NextResponse.json({ error: error.message || "Failed to create envelope" }, { status: 500 });
  }
}
