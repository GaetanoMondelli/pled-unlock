import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Get agreementId from URL params
  const { searchParams } = new URL(req.url);
  const agreementId = searchParams.get('agreementId');

  if (!agreementId) {
    return NextResponse.json(
      { error: 'Agreement ID is required' },
      { status: 400 }
    );
  }

  // Mock response matching the format from the example
  const mockResponse = {
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
      source: "DocuSign Navigator API"
    }
  };

  return NextResponse.json(mockResponse);
} 