import { NextResponse } from 'next/server';

const BASE_URL = 'https://demo.docusign.net/restapi/v2.1';

export async function GET(request: Request) {
  try {
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const accountId = request.headers.get('Account-Id');

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication' },
        { status: 401 }
      );
    }

    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `${BASE_URL}/accounts/${accountId}/envelopes?from_date=${fromDate}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list envelopes');
    }

    return NextResponse.json(await response.json());
  } catch (error: any) {
    console.error('List envelopes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list envelopes' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
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