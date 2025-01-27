import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic'; // Mark route as dynamic

export async function GET(req: NextRequest) {
  try {
    // Get auth header from request using headers() API
    const headersList = headers();
    const authHeader = headersList.get("authorization");
    const accountId = headersList.get("account-id");

    if (!authHeader || !accountId) {
      return NextResponse.json({ error: "Missing authorization or account ID" }, { status: 401 });
    }

    // Forward request to DocuSign Navigator API using the correct API URL
    const response = await fetch(`https://demo.docusign.net/services/api/v2.0/accounts/${accountId}/agreements`, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      try {
        const errorJson = JSON.parse(error);
        throw new Error(errorJson.message || "Failed to fetch agreements");
      } catch {
        throw new Error(error || "Failed to fetch agreements");
      }
    }

    // Handle empty response
    const text = await response.text();
    if (!text) {
      return NextResponse.json({ agreements: [] });
    }

    try {
      const data = JSON.parse(text);
      // Transform agreements to expected format
      const agreements = (data.agreements || []).map((agreement: any) => ({
        agreementId: agreement.id,
        name: agreement.name || agreement.title,
        status: agreement.status,
        created: agreement.createdDate || agreement.created,
        lastModified: agreement.lastModifiedDate || agreement.modified,
        description: agreement.description,
      }));
      return NextResponse.json({ agreements });
    } catch (error) {
      console.error("Failed to parse response:", text);
      throw new Error("Invalid response from DocuSign");
    }
  } catch (error: any) {
    console.error("Navigator API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch agreements" }, { status: error.status || 500 });
  }
}
