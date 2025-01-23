import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { clickwrapId: string } }
) {
  try {
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const accountId = req.headers.get('account-id');

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      );
    }

    const { userIdentifier } = await req.json();

    // Get user agreement status from DocuSign
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${params.clickwrapId}/agreements/${userIdentifier}`, 
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to get agreement status' }));
      throw new Error(error.message);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error getting agreement status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get agreement status' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { clickwrapId: string } }
) {
  try {
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const accountId = req.headers.get('account-id');

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      );
    }

    // Create agreement URL request
    const response = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${params.clickwrapId}/agreements`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: "Test User",
          email: "test@example.com",
          clientUserId: "test_user_1",
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/procedures/proc_123?tab=playground`,
          agreementId: `agreement_${Date.now()}` // Add unique agreement ID
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create agreement URL' }));
      throw new Error(error.message);
    }

    const result = await response.json();
    return NextResponse.json({
      agreementUrl: result.agreementUrl
    });

  } catch (error: any) {
    console.error('Error creating agreement URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agreement URL' },
      { status: 500 }
    );
  }
} 