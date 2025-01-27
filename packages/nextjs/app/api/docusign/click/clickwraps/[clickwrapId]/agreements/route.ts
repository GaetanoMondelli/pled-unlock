import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { clickwrapId: string } }) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const accountId = req.headers.get("account-id");

    if (!accessToken || !accountId) {
      return NextResponse.json({ error: "Missing authentication headers" }, { status: 401 });
    }

    console.log("Checking users for clickwrap:", params.clickwrapId);

    // Get all users who have signed this clickwrap
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${params.clickwrapId}/users`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // Get response text first
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    // Try to parse JSON only if there's content
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : { userAgreements: [] };
    } catch (e) {
      console.error("Failed to parse response:", e);
      result = { userAgreements: [] };
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to get agreements list");
    }

    // Pass through the userAgreements array directly
    return NextResponse.json({
      hasAgreed: result.userAgreements?.length > 0,
      agreements: result.userAgreements || [],
      totalAgreements: result.userAgreements?.length || 0,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error: any) {
    console.error("Error getting agreements list:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to get agreements list",
        hasAgreed: false,
        agreements: [],
        totalAgreements: 0,
      },
      { status: 200 },
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { clickwrapId: string } }) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const accountId = req.headers.get("account-id");

    if (!accessToken || !accountId) {
      return NextResponse.json({ error: "Missing authentication headers" }, { status: 401 });
    }

    // Create agreement URL request with minimal required fields
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${params.clickwrapId}/agreements`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: "Test User",
          email: "test@example.com",
          clientUserId: Date.now().toString(),
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/procedures/proc_123?tab=playground`,
        }),
      },
    );

    // Get response text first to debug
    const responseText = await response.text();
    console.log("Raw agreement URL response:", responseText);

    // Try to parse JSON
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error("Failed to parse agreement URL response:", e);
      throw new Error("Invalid response from DocuSign");
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to create agreement URL");
    }

    if (!result.agreementUrl) {
      throw new Error("No agreement URL in response");
    }

    return NextResponse.json({
      agreementUrl: result.agreementUrl,
    });
  } catch (error: any) {
    console.error("Error creating agreement URL:", error);
    return NextResponse.json({ error: error.message || "Failed to create agreement URL" }, { status: 500 });
  }
}
