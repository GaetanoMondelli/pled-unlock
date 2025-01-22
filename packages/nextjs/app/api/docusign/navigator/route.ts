import { NextResponse } from 'next/server';

// Remove hardcoded base URL since we'll get it from auth
async function getNavigatorToken(origin: string | null) {
  console.log('[Navigator] Getting Navigator-specific token...');
  const authResponse = await fetch(`${origin}/api/docusign/navigator/authenticate`, {
    method: 'POST'
  });
  
  const data = await authResponse.json();

  // Handle consent required case
  if (data.error === 'Consent required' && data.consentUrl) {
    throw new Error('consent_required');
  }

  if (!authResponse.ok || !data.accessToken || !data.accountId) {
    console.error('[Navigator] Auth failed:', data);
    throw new Error('Failed to authenticate with Navigator');
  }
  
  return {
    accessToken: data.accessToken,
    accountId: data.accountId,
    baseUrl: data.baseUrl || 'https://api-d.docusign.com/v1'  // Use default if not provided
  };
}

export async function GET(req: Request) {
  // Get agreementId and useMock from URL params
  const { searchParams } = new URL(req.url);
  const agreementId = searchParams.get('agreementId');
  const useMock = searchParams.get('useMock') === 'true';

  console.log('[Navigator GET] Starting request, useMock:', useMock, 'agreementId:', agreementId);

  if (!agreementId) {
    return NextResponse.json(
      { error: 'Agreement ID is required' },
      { status: 400 }
    );
  }

  if (useMock) {
    console.log('[Navigator GET] Returning mock data');
    return NextResponse.json({
      id: agreementId,
      agreement_type: {
        primary: "Other",
        refresh: true
      },
      party: "SAN LUIS COUNTY FLOOD CONTROL AND WATER CONSERVATION DISTRICT, CITY OF ARROW",
      dates: {
        effective: "2020/11/01",
        expiration: "2029/10/31"
      },
      renewal: {
        type: "NO_OR_CONSENT_REQUIRED",
        notice_period: null,
        notice_date: null,
        term: "1 year",
        owner: "SAN LUIS COUNTY FLOOD CONTROL AND WATER CONSERVATION DISTRICT"
      },
      additional_information: null,
      metadata: {
        last_updated: new Date().toISOString(),
        source: "DocuSign Navigator API (Mock)"
      }
    });
  }

  try {
    const { accessToken, accountId, baseUrl } = await getNavigatorToken(req.headers.get('origin'));
    console.log('[Navigator GET] Authenticated successfully');

    // Call Navigator API for agreement details
    const navigatorUrl = `${baseUrl}/accounts/${accountId}/agreements/${agreementId}`;
    console.log('[Navigator GET] Calling Navigator API:', navigatorUrl);
    
    const navigatorResponse = await fetch(navigatorUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!navigatorResponse.ok) {
      const errorText = await navigatorResponse.text();
      console.error('[Navigator GET] Navigator API error:', errorText);
      throw new Error(`Navigator API error: ${navigatorResponse.statusText}. ${errorText}`);
    }

    const data = await navigatorResponse.json();
    console.log('[Navigator GET] Success, returning data');
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Navigator GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agreement data' },
      { status: 500 }
    );
  }
}

// Add new endpoint to list all agreements
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const useMock = searchParams.get('useMock') === 'true';

  console.log('[Navigator POST] Starting request, useMock:', useMock);

  if (useMock) {
    console.log('[Navigator POST] Returning mock data');
    return NextResponse.json({
      agreements: [
        {
          id: "mock-agreement-1",
          file_name: "Mock Agreement 1.pdf",
          status: "active"
        },
        {
          id: "mock-agreement-2", 
          file_name: "Mock Agreement 2.pdf",
          status: "expired"
        }
      ]
    });
  }

  try {
    // Get auth from request headers
    const authHeader = req.headers.get('Authorization');
    const accountId = req.headers.get('Account-Id');

    if (!authHeader || !accountId) {
      return NextResponse.json(
        { error: 'Missing authorization headers' },
        { status: 401 }
      );
    }

    // Use the token from the request header
    const token = authHeader.replace('Bearer ', '');
    const baseUrl = 'https://api-d.docusign.com/v1';  // Use constant base URL for Navigator API
    
    // Call Navigator API with the provided token
    const navigatorUrl = `${baseUrl}/accounts/${accountId}/agreements`;
    console.log('[Navigator POST] Calling Navigator API:', navigatorUrl);
    
    const navigatorResponse = await fetch(navigatorUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Log full response for debugging
    const responseText = await navigatorResponse.text();
    console.log('[Navigator POST] Raw response:', {
      status: navigatorResponse.status,
      statusText: navigatorResponse.statusText,
      headers: Object.fromEntries(navigatorResponse.headers.entries())
    });

    if (!navigatorResponse.ok) {
      // If token is expired or invalid, return 401
      if (navigatorResponse.status === 401) {
        return NextResponse.json(
          { error: 'Token expired or invalid' },
          { status: 401 }
        );
      }
      throw new Error(`Navigator API error (${navigatorResponse.status}): ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[Navigator POST] Failed to parse response as JSON:', responseText);
      throw new Error('Invalid JSON response from Navigator API');
    }

    console.log('[Navigator POST] Success, returning data:', data);
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Navigator POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agreements' },
      { status: 500 }
    );
  }
} 