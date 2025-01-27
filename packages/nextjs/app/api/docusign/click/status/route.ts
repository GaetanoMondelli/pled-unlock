import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { clickwrapId, agreementId } = await request.json();
    const authHeader = request.headers.get("Authorization");
    const accountId = request.headers.get("Account-Id");

    if (!authHeader || !accountId) {
      return NextResponse.json({ error: "Missing auth headers" }, { status: 401 });
    }

    // Get agreement status
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrapId}/agreements/${agreementId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authHeader}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Status check error:", error);
      throw new Error("Failed to get agreement status");
    }

    const status = await response.json();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check status",
        details: error,
      },
      { status: 500 },
    );
  }
}
