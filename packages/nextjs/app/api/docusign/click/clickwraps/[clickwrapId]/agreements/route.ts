import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { clickwrapId: string } }
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const accountId = req.headers.get('Account-Id');

    if (!authHeader || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      );
    }

    const { userIdentifier } = await req.json();

    if (!userIdentifier) {
      return NextResponse.json(
        { error: 'Missing user identifier' },
        { status: 400 }
      );
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Make REST API call to get user agreement status
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${params.clickwrapId}/users/${userIdentifier}/agreements`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get agreement status');
    }

    const result = await response.json();
    return NextResponse.json({
      status: result.status,
      agreedOn: result.agreedOn,
      clientIPAddress: result.clientIPAddress
    });

  } catch (error: any) {
    console.error('Error getting agreement status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get agreement status' },
      { status: error.status || 500 }
    );
  }
} 