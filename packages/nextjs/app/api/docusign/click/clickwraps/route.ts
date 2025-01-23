import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Get auth headers
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const accountId = req.headers.get('account-id');

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      );
    }

    // Parse JSON body instead of FormData
    const body = await req.json();
    
    // Create clickwrap using DocuSign Click API with correct structure
    const response = await fetch('https://demo.docusign.net/clickapi/v1/accounts/' + accountId + '/clickwraps', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clickwrapName: body.displaySettings.displayName,  // Required field
        displaySettings: {
          displayName: body.displaySettings.displayName,
          consentButtonText: body.displaySettings.consentButtonText,
          downloadable: true,
          format: body.displaySettings.format,
          mustRead: body.displaySettings.mustRead,
          requireAccept: body.displaySettings.requireAccept,
          documentDisplay: body.displaySettings.documentDisplay,
          termsAndConditionsLabel: "Terms and Conditions"
        },
        documents: body.documents,
        requireReacceptance: false,
        status: "active"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DocuSign Click API error:', error);
      throw new Error(error.message || 'Failed to create clickwrap');
    }

    const result = await response.json();
    return NextResponse.json({
      clickwrapId: result.clickwrapId,
      status: result.status
    });

  } catch (error: any) {
    console.error('Error creating clickwrap:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create clickwrap' },
      { status: 500 }
    );
  }
} 