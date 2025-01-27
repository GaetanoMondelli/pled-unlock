import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authHeader = request.headers.get("Authorization");
    const accountId = request.headers.get("Account-Id");

    console.log("Creating clickwrap with:", {
      auth: !!authHeader,
      accountId,
      data: { ...data, documents: data.documents.length },
    });

    if (!authHeader || !accountId) {
      return NextResponse.json({ error: "Missing auth headers" }, { status: 401 });
    }

    // Create clickwrap first in draft status
    const clickwrapRequest = {
      displaySettings: {
        displayName: data.clickwrapName,
        consentButtonText: "I Agree",
        downloadable: true,
        format: "modal",
        hasDeclineButton: false,
        mustRead: true,
        requireAccept: true,
        documentDisplay: "document",
        sendToEmail: false,
      },
      documents: data.documents.map((doc: any, index: number) => ({
        documentBase64: doc.documentBase64,
        documentName: doc.documentName,
        fileExtension: doc.fileExtension,
        order: doc.order || index + 1,
      })),
      name: data.clickwrapName,
      requireReacceptance: false,
      status: "draft", // Create as draft first
    };

    // Create clickwrap
    const clickwrapResponse = await fetch(`https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clickwrapRequest),
    });

    if (!clickwrapResponse.ok) {
      const error = await clickwrapResponse.json();
      console.error("DocuSign error:", error);
      throw new Error(`DocuSign error: ${error.message || JSON.stringify(error)}`);
    }

    const clickwrap = await clickwrapResponse.json();
    console.log("Clickwrap created:", clickwrap);

    // Activate the clickwrap
    const activateResponse = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrap.clickwrapId}/versions/${clickwrap.versionId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "active",
        }),
      },
    );

    if (!activateResponse.ok) {
      const error = await activateResponse.json();
      console.error("Activation error:", error);
      throw new Error("Failed to activate clickwrap");
    }

    console.log("Clickwrap activated");

    // Now get agreement URL - using the correct endpoint and payload
    const urlResponse = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrap.clickwrapId}/agreements`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientUserId: Date.now().toString(),
          email: "test@example.com",
          fullName: "Test User",
          returnUrl: "http://localhost:3000",
          agreementId: `agreement_${Date.now()}`, // Unique ID for the agreement
        }),
      },
    );

    if (!urlResponse.ok) {
      const error = await urlResponse.json();
      console.error("Agreement URL error:", error);
      throw new Error("Failed to get agreement URL");
    }

    const agreementResponse = await urlResponse.json();
    console.log("Agreement response:", agreementResponse);

    return NextResponse.json({
      clickwrapId: clickwrap.clickwrapId,
      agreementUrl: agreementResponse.agreementUrl,
    });
  } catch (error) {
    console.error("Error creating clickwrap:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create clickwrap",
        details: error,
      },
      { status: 500 },
    );
  }
}
