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

  // Mock response
  const mockResponse = {
    id: agreementId,
    title: "Software Development Agreement",
    type: "service_agreement",
    status: "active",
    parties: [
      { role: "contractor", name: "John Developer" },
      { role: "client", name: "Tech Corp Inc" }
    ],
    provisions: {
      payment: { amount: "5000", currency: "USD" },
      duration: "3 months",
      scope: "Full-stack development"
    }
  };

  return NextResponse.json(mockResponse);
} 