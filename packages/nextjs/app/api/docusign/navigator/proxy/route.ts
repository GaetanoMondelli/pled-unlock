import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url, method = 'GET', body, token } = await req.json();
    
    // Extract account ID from URL
    const accountId = url.split('/accounts/')[1]?.split('/')[0];
    if (!accountId) {
      throw new Error('Account ID not found in URL');
    }

    // Use the correct Navigator API endpoint
    const navigatorUrl = url.includes('/agreements/') 
      ? `https://api-d.docusign.com/v1/accounts/${accountId}/agreements/${url.split('/agreements/')[1]}`
      : `https://api-d.docusign.com/v1/accounts/${accountId}/agreements`;

    console.log('[Navigator Proxy] Calling:', {
      url: navigatorUrl,
      method,
      tokenStart: token?.substring(0, 20) + '...'
    });

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Required Navigator headers
      'X-DocuSign-SDK': 'Node',
      'X-DocuSign-SDK-Version': '1.0.0',
      'X-DocuSign-API-AccountId': accountId
    };

    console.log('[Navigator Proxy] Headers:', {
      ...headers,
      Authorization: headers.Authorization.substring(0, 20) + '...'
    });

    const response = await fetch(navigatorUrl, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    // Get response as text first to log it
    const responseText = await response.text();
    
    console.log('[Navigator Proxy] Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      text: responseText.substring(0, 200) + '...'
    });

    // Check if we got HTML instead of JSON
    if (responseText.includes('<!DOCTYPE html>')) {
      console.error('[Navigator Proxy] Got HTML response - token likely invalid');
      return NextResponse.json(
        { error: 'Authentication failed - token not valid for Navigator API' },
        { status: 401 }
      );
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      
      // If this is a single agreement request (has /agreements/{id})
      if (url.includes('/agreements/')) {
        return NextResponse.json(data);
      }
      
      // Otherwise it's a list request
      const agreements = data.data?.map((agreement: any) => ({
        id: agreement.id,
        fileName: agreement.file_name,
        type: agreement.type,
        category: agreement.category,
        status: agreement.status
      })) || [];

      console.log('[Navigator Proxy] Found agreements:', agreements);

      return NextResponse.json({ agreements });
    } catch (e) {
      console.error('[Navigator Proxy] Failed to parse response as JSON:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from Navigator API' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('[Navigator Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Navigator proxy request failed' },
      { status: 500 }
    );
  }
} 