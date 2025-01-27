import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Remove hardcoded base URL since we'll get it from auth
async function getNavigatorToken(origin: string | null) {
  console.log("[Navigator] Getting Navigator-specific token...");
  const authResponse = await fetch(`${origin}/api/docusign/navigator/authenticate`, {
    method: "POST",
  });

  const data = await authResponse.json();

  // Handle consent required case
  if (data.error === "Consent required" && data.consentUrl) {
    const error = new Error("consent_required");
    error.consentUrl = data.consentUrl; // Pass the URL through
    throw error;
  }

  if (!authResponse.ok || !data.accessToken || !data.accountId || !data.baseUrl) {
    console.error("[Navigator] Auth failed:", data);
    throw new Error("Failed to authenticate with Navigator");
  }

  return {
    accessToken: data.accessToken,
    accountId: data.accountId,
    baseUrl: data.baseUrl,
  };
}

// Try beta endpoints since Navigator is in beta
const POSSIBLE_BASE_URLS = [
  // Demo beta URLs - try simpler patterns first
  "https://api-d.docusign.net/navigator/v1",
  "https://api-d.docusign.net/navigator/v1/agreements",
  "https://api-d.docusign.net/navigator/v1/accounts/{accountId}/agreements",
];

export async function GET(req: Request) {
  // Get agreementId and useMock from URL params
  const { searchParams } = new URL(req.url);
  const agreementId = searchParams.get("agreementId");
  const useMock = searchParams.get("useMock") === "true";

  console.log("[Navigator GET] Starting request, useMock:", useMock, "agreementId:", agreementId);

  if (!agreementId) {
    return NextResponse.json({ error: "Agreement ID is required" }, { status: 400 });
  }

  if (useMock) {
    console.log("[Navigator GET] Returning mock data");
    return NextResponse.json({
      id: agreementId,
      agreement_type: {
        primary: "Other",
        refresh: true,
      },
      party: "SAN LUIS COUNTY FLOOD CONTROL AND WATER CONSERVATION DISTRICT, CITY OF ARROW",
      dates: {
        effective: "2020/11/01",
        expiration: "2029/10/31",
      },
      renewal: {
        type: "NO_OR_CONSENT_REQUIRED",
        notice_period: null,
        notice_date: null,
        term: "1 year",
        owner: "SAN LUIS COUNTY FLOOD CONTROL AND WATER CONSERVATION DISTRICT",
      },
      additional_information: null,
      metadata: {
        last_updated: new Date().toISOString(),
        source: "DocuSign Navigator API (Mock)",
      },
    });
  }

  try {
    const { accessToken, accountId } = await getNavigatorToken(req.headers.get("origin"));
    console.log("[Navigator GET] Authenticated successfully");

    // Call Navigator API for agreement details
    const navigatorUrl = POSSIBLE_BASE_URLS[0].replace("{accountId}", accountId);
    console.log("[Navigator GET] Calling Navigator API:", navigatorUrl);

    const navigatorResponse = await fetch(navigatorUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!navigatorResponse.ok) {
      const errorText = await navigatorResponse.text();
      console.error("[Navigator GET] Navigator API error:", errorText);
      throw new Error(`Navigator API error: ${navigatorResponse.statusText}. ${errorText}`);
    }

    const data = await navigatorResponse.json();
    console.log("[Navigator GET] Success, returning data");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Navigator GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch agreement data" }, { status: 500 });
  }
}

// Add new endpoint to list all agreements
export async function POST(req: Request) {
  try {
    const { url, method, body, useMock = false } = await req.json();

    console.log("[Navigator POST] Starting request:", { useMock });

    if (useMock) {
      console.log("[Navigator POST] Returning mock data");
      return NextResponse.json({
        agreements: [
          {
            id: "mock-agreement-1",
            file_name: "Mock Agreement 1.pdf",
            status: "active",
          },
          {
            id: "mock-agreement-2",
            file_name: "Mock Agreement 2.pdf",
            status: "expired",
          },
        ],
      });
    }

    // Get Navigator-specific token
    console.log("[Navigator] Getting Navigator-specific token...");
    const authResponse = await fetch("/api/docusign/navigator/authenticate", {
      method: "POST",
    });

    const authData = await authResponse.json();

    if (authData.error === "Consent required") {
      throw new Error("consent_required");
    }

    // Make the actual Navigator API call through our proxy
    const proxyResponse = await fetch("/api/docusign/navigator/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        method,
        body,
        token: authData.accessToken,
      }),
    });

    if (!proxyResponse.ok) {
      throw new Error(`Navigator API call failed: ${proxyResponse.statusText}`);
    }

    const data = await proxyResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Navigator POST] Error:", error);
    return NextResponse.json({ error: error.message || "Navigator request failed" }, { status: error.status || 401 });
  }
}
