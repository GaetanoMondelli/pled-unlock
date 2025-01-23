import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

    const accessToken = authHeader.replace('Bearer ', '');

    // Make REST API call to get clickwrap status
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${params.clickwrapId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get clickwrap');
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error getting clickwrap:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get clickwrap' },
      { status: error.status || 500 }
    );
  }
} 