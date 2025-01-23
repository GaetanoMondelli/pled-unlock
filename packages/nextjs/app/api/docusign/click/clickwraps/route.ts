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
    console.log('Received request body:', {
      ...body,
      documents: body.documents?.map((doc: any) => ({
        ...doc,
        documentBase64: '[BASE64_CONTENT]'
      }))
    });
    
    // First create the clickwrap
    const createResponse = await fetch('https://demo.docusign.net/clickapi/v1/accounts/' + accountId + '/clickwraps', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clickwrapName: body.displaySettings.displayName,
        displaySettings: {
          displayName: body.displaySettings.displayName,
          consentButtonText: "I Agree",
          downloadable: true,
          format: "modal",
          mustRead: false,
          requireAccept: true,
          documentDisplay: "document",
          sendToEmail: false,
          allowViewHistory: true,
          allowUnassociatedUse: true,
          requireReacceptance: false,
          termsAndConditionsLabel: "Terms and Conditions",
          topLabel: "Please review the following terms and conditions",
          bottomLabel: "Click 'I Agree' to continue"
        },
        documents: body.documents.map(doc => ({
          ...doc,
          documentName: doc.documentName || "Terms and Conditions",
          documentDisplay: "document",
          order: 1
        })),
        requireReacceptance: false,
        status: "draft"
      })
    });

    const createResult = await createResponse.json();
    console.log('Create clickwrap response:', createResult);

    if (!createResponse.ok) {
      console.error('DocuSign Click API error (create):', createResult);
      throw new Error(createResult.message || 'Failed to create clickwrap');
    }

    const clickwrapId = createResult.clickwrapId;

    // Then activate the clickwrap
    const activateResponse = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrapId}/versions/1`, 
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: "active"
        })
      }
    );

    // Don't try to parse response if it's empty
    let activateResult;
    const activateText = await activateResponse.text();
    try {
      activateResult = activateText ? JSON.parse(activateText) : {};
      console.log('Activate clickwrap response:', activateResult);
    } catch (e) {
      console.log('Activate response (raw):', activateText);
    }

    if (!activateResponse.ok) {
      console.error('DocuSign Click API error (activate):', activateResult || activateText);
      throw new Error(
        (activateResult && activateResult.message) || 
        'Failed to activate clickwrap'
      );
    }

    // Get the final clickwrap status
    const statusResponse = await fetch(
      `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrapId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const statusResult = await statusResponse.json();
    console.log('Final clickwrap status:', statusResult);

    return NextResponse.json({
      clickwrapId: clickwrapId,
      status: statusResult.status || "active"
    });

  } catch (error: any) {
    console.error('Error creating/activating clickwrap:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create/activate clickwrap' },
      { status: 500 }
    );
  }
} 