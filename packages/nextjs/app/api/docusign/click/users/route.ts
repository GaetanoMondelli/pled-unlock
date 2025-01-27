import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { clickwrapId } = await request.json();
    const authHeader = request.headers.get("Authorization");
    const accountId = request.headers.get("Account-Id");
    // const accountId = "3d75ee95-c9b7-4531-80e7-31ad925c641c";

    if (!authHeader || !accountId) {
      return NextResponse.json({ error: "Missing auth headers" }, { status: 401 });
    }

    console.log("Request details:", {
      url: `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrapId}/users`,
      accountId,
      clickwrapId,
      authHeader: `${authHeader}`.substring(0, 20) + "...", // Log partial token for security
    });

    // Get users who agreed to the clickwrap
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrapId}/users?from_date=2020-01-01`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authHeader}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Log request details for debugging

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: "Unauthorized - Please check your authentication token",
            status: response.status,
          },
          { status: 401 },
        );
      }

      const errorText = await response.text();
      console.error("DocuSign error response text:", errorText);

      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          {
            error: errorJson.message || "Failed to get user agreements",
            details: errorJson,
          },
          { status: response.status },
        );
      } catch {
        return NextResponse.json(
          {
            error: errorText || "Failed to get user agreements",
            status: response.status,
          },
          { status: response.status },
        );
      }
    }

    const data = await response.json();
    console.log("User agreements response data:", data);

    // Format the response according to the API docs
    const formattedData = {
      clickwrapId,
      userAgreements: data.userAgreements || [],
      page: data.page || 1,
      pageSize: data.pageSize || 100,
      minimumPagesRemaining: data.minimumPagesRemaining || 0,
      totalSetSize: data.totalSetSize || 0,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error checking user agreements:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check user agreements",
        details: error,
      },
      { status: 500 },
    );
  }
}
