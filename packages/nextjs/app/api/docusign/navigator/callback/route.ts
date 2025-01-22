import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const AUTH_BASE_URL = 'https://account-d.docusign.com';
const PLAYGROUND_URL = 'http://localhost:3000/procedures/proc_123?tab=playground';  // Hardcode for now

// Add getConfig function
function getConfig() {
  const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
  console.log('[Navigator Callback] Reading config from:', configPath);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');
    const returnUrl = searchParams.get('state') || PLAYGROUND_URL;
    
    console.log('[Navigator Callback] Received params:', { 
      code: code?.substring(0, 20) + '...', // Truncate for logging
      error, 
      error_description, 
      returnUrl,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error || error_description) {
      throw new Error(`OAuth error: ${error_description || error}`);
    }
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    // Read configuration
    const config = getConfig();

    // Exchange code for token
    const tokenResponse = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': config.dsJWTClientId,
        'client_secret': config.secret,
        'redirect_uri': `${req.headers.get('origin')}/api/docusign/navigator/callback`  // Add this back
      })
    });

    const responseText = await tokenResponse.text();
    console.log('[Navigator Callback] Token response:', {
      status: tokenResponse.status,
      text: responseText
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);

    // Create an HTML response that sets localStorage and redirects
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <script>
            try {
              // Store both consent and auth data
              localStorage.setItem('navigatorConsent', 'granted');
              localStorage.setItem('navigatorAuth', JSON.stringify({
                accessToken: '${tokenData.access_token}',
                accountId: '${config.impersonatedUserGuid}',
                baseUrl: 'https://api-d.docusign.com/v1',
                type: 'navigator'
              }));
              
              // Redirect back to the app
              window.location.href = '${returnUrl}';
            } catch (e) {
              console.error('Failed to store auth data:', e);
              document.body.innerHTML = 'Error: ' + e.message;
            }
          </script>
        </head>
        <body>
          <p>Authenticating...</p>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('[Navigator Callback] Error:', error);
    const returnUrl = searchParams?.get('state') || PLAYGROUND_URL;
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(redirectUrl.toString());
  }
} 