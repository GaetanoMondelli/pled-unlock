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

    if (!documentFile) {
      return NextResponse.json(
        { error: 'No document provided' },
        { status: 400 }
      );
    }

    const documentContent = await documentFile.text();
    const envelope = {
      emailSubject: 'Please sign this document',
      documents: [{
        documentBase64: Buffer.from(documentContent).toString('base64'),
        name: documentFile.name,
        fileExtension: documentFile.name.split('.').pop(),
        documentId: '1'
      }],
      recipients: {
        signers: [{
          email: signerEmail,
          name: signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{
              anchorString: '/sig1/',
              anchorXOffset: '20',
              anchorUnits: 'pixels'
            }]
          }
        }]
      },
      status: 'sent'
    };

    const response = await fetch(`${BASE_URL}/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envelope)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create envelope');
    }

    return NextResponse.json(await response.json());
  } catch (error: any) {
    console.error('Create envelope error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create envelope' },
      { status: 500 }
    );
  }
} 