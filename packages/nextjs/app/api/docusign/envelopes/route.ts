import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const accountId = req.headers.get("account-id");

    if (!authHeader || !accountId) {
      return NextResponse.json({ error: "Missing authorization header or account ID" }, { status: 401 });
    }

    const response = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes?from_date=2024-01-01`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || "Failed to list envelopes" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      envelopes: data.envelopes.map((env: any) => ({
        envelopeId: env.envelopeId,
        status: env.status,
        emailSubject: env.emailSubject,
        sentDateTime: env.sentDateTime,
        completedDateTime: env.completedDateTime,
      })),
    });
  } catch (error: any) {
    console.error("Error listing envelopes:", error);
    return NextResponse.json({ error: error.message || "Failed to list envelopes" }, { status: 500 });
  }
}
