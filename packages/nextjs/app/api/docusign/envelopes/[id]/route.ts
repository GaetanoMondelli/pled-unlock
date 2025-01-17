import { NextResponse } from 'next/server';

const BASE_URL = 'https://demo.docusign.net/restapi/v2.1';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const accountId = request.headers.get('Account-Id');

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${BASE_URL}/accounts/${accountId}/envelopes/${params.id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get envelope status');
    }

    return NextResponse.json(await response.json());
  } catch (error: any) {
    console.error('Get envelope status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get envelope status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const accountId = request.headers.get('Account-Id');
    const data = await request.json();

    console.log('Sending envelope request:', {
      envelopeId: params.id,
      accountId,
      data
    });

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication' },
        { status: 401 }
      );
    }

    // First, get current envelope details
    const getResponse = await fetch(
      `${BASE_URL}/accounts/${accountId}/envelopes/${params.id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error('Failed to get envelope details');
    }

    const envelopeDetails = await getResponse.json();
    console.log('Current envelope details:', envelopeDetails);

    // Update recipients
    if (data.recipients?.length > 0) {
      console.log('Updating recipients:', data.recipients);

      // Create recipients request
      const recipientsBody = {
        signers: data.recipients.map((recipient: any) => ({
          email: recipient.email,
          name: recipient.name,
          recipientId: recipient.recipientId,
          routingOrder: recipient.routingOrder,
          // Don't include clientUserId to enable email sending
          tabs: {
            signHereTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '100',
                scale: 1,
                recipientId: recipient.recipientId
              }
            ]
          }
        }))
      };

      console.log('Recipients request body:', recipientsBody);

      // Delete existing recipients first
      await fetch(
        `${BASE_URL}/accounts/${accountId}/envelopes/${params.id}/recipients`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Add new recipients
      const recipientsResponse = await fetch(
        `${BASE_URL}/accounts/${accountId}/envelopes/${params.id}/recipients`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(recipientsBody)
        }
      );

      if (!recipientsResponse.ok) {
        const errorText = await recipientsResponse.text();
        console.error('Update recipients error:', {
          status: recipientsResponse.status,
          statusText: recipientsResponse.statusText,
          body: errorText
        });
        throw new Error('Failed to update recipients');
      }

      const recipientsResult = await recipientsResponse.json();
      console.log('Recipients update result:', recipientsResult);
    }

    // Update status to 'sent'
    console.log('Updating envelope status to:', data.status);
    const updateResponse = await fetch(
      `${BASE_URL}/accounts/${accountId}/envelopes/${params.id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: data.status
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Update status error:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        body: errorText
      });
      throw new Error('Failed to update envelope status');
    }

    // Get final status
    const finalResponse = await fetch(
      `${BASE_URL}/accounts/${accountId}/envelopes/${params.id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const finalStatus = await finalResponse.json();
    console.log('Final envelope status:', finalStatus);

    return NextResponse.json({
      envelopeId: params.id,
      status: finalStatus.status,
      message: 'Envelope sent successfully',
      details: {
        created: finalStatus.createdDateTime,
        sentDateTime: finalStatus.sentDateTime,
        status: finalStatus.status,
        emailSubject: finalStatus.emailSubject,
        recipients: finalStatus.recipients?.signers || []
      }
    });
  } catch (error: any) {
    console.error('Send envelope error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send envelope' },
      { status: 500 }
    );
  }
} 