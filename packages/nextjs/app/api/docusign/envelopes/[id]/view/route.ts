import { NextResponse } from "next/server";

// const BASE_URL = 'https://demo.docusign.net/restapi/v2.1';
const BASE_URL = "https://api.docusign.com/v1/accounts/{{accountId}}";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const accountId = request.headers.get("Account-Id");
    const data = await request.json();

    if (!accessToken || !accountId) {
      return NextResponse.json({ error: "Missing authentication" }, { status: 401 });
    }

    // Create recipient view request
    const viewRequest = {
      returnUrl: `${request.headers.get("origin")}/docusign-return`,
      authenticationMethod: "none",
      email: data.email,
      userName: data.name,
      clientUserId: "1000", // Must match the value used when creating envelope
    };

    const response = await fetch(`${BASE_URL}/accounts/${accountId}/envelopes/${params.id}/views/recipient`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(viewRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create signing URL");
    }

    const result = await response.json();
    return NextResponse.json({ url: result.url });
  } catch (error: any) {
    console.error("Create signing URL error:", error);
    return NextResponse.json({ error: error.message || "Failed to create signing URL" }, { status: 500 });
  }
}
