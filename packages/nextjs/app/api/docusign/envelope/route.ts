import { NextResponse } from 'next/server';

const BASE_URL = 'https://demo.docusign.net/restapi/v2.1';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const accountId = request.headers.get('Account-Id');

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication' },
        { status: 401 }
      );
    }

    const signerEmail = formData.get('signerEmail') as string;
    const signerName = formData.get('signerName') as string;
    const documentFile = formData.get('document') as File;
    const tabsData = formData.get('tabs') as string;
    const templateData = formData.get('templateData') as string;

    if (!documentFile) {
      return NextResponse.json(
        { error: 'No document provided' },
        { status: 400 }
      );
    }

    console.log('Creating envelope with:', {
      signerEmail,
      signerName,
      fileName: documentFile.name,
      tabsData,
      templateData
    });

    // Convert document to base64
    const documentBuffer = Buffer.from(await documentFile.arrayBuffer());
    const documentBase64 = documentBuffer.toString('base64');

    // Parse tabs and template data
    const tabs = tabsData ? JSON.parse(tabsData) : {};
    const templateVariables = templateData ? JSON.parse(templateData) : {};

    // Create envelope definition
    const envelope = {
      emailSubject: 'Please sign this document',
      emailBlurb: 'Please review and sign this document at your earliest convenience.',
      documents: [{
        documentBase64,
        name: documentFile.name,
        fileExtension: documentFile.name.split('.').pop(),
        documentId: '1',
        transformPdfFields: true
      }],
      recipients: {
        signers: [{
          email: signerEmail,
          name: signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '100',
                optional: false,
                recipientId: '1',
                name: 'SignHere_1',
                tabLabel: 'SignHere_1'
              }
            ],
            ...tabs
          }
        }]
      },
      status: 'created'
    };

    console.log('Envelope request:', {
      ...envelope,
      documents: [{
        ...envelope.documents[0],
        documentBase64: '[REDACTED]'
      }]
    });

    const response = await fetch(`${BASE_URL}/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envelope)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create envelope error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.message || 'Failed to create envelope');
      } catch (e) {
        throw new Error(`Failed to create envelope: ${response.status} ${response.statusText}\n${errorText}`);
      }
    }

    const result = await response.json();
    console.log('Envelope created:', result);

    return NextResponse.json({
      envelopeId: result.envelopeId,
      status: result.status,
      message: 'Envelope created successfully'
    });
  } catch (error: any) {
    console.error('Create envelope error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create envelope' },
      { status: 500 }
    );
  }
} 