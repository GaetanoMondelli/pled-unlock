import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ContractStateMachine } from '@/app/lib/ContractStateMachine';

const REDIRECT_URI = 'http://localhost:3000/api/docusign/navigator/callback';
const HOME_URL = 'http://localhost:3000';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');
    const returnUrl = searchParams.get('state') || HOME_URL;
    
    console.log('[Navigator Callback] Received params:', { 
      code: code?.substring(0, 20) + '...', 
      error, 
      error_description, 
      returnUrl
    });

    if (error || error_description) {
      throw new Error(`OAuth error: ${error_description || error}`);
    }
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    // Read configuration
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Exchange code for token
    const tokenResponse = await fetch(`${config.dsOauthServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': config.dsJWTClientId,
        'client_secret': config.secret,
        'redirect_uri': REDIRECT_URI
      })
    });

    const responseText = await tokenResponse.text();
    console.log('[Navigator Callback] Token response:', {
      status: tokenResponse.status,
      text: responseText
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code: ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);

    // Get user info to get accountId
    const userInfoResponse = await fetch(`${config.dsOauthServer}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userInfo = await userInfoResponse.json();
    console.log('[Navigator Callback] User info:', userInfo);

    // Create an HTML response that sets localStorage and redirects
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <script>
            try {
              localStorage.setItem('navigatorConsent', 'granted');
              localStorage.setItem('navigatorAuth', JSON.stringify({
                accessToken: '${tokenData.access_token}',
                refreshToken: '${tokenData.refresh_token}',
                expiresIn: ${tokenData.expires_in},
                tokenType: '${tokenData.token_type}',
                accountId: '${userInfo.accounts[0].account_id}',
                baseUrl: 'https://api-d.docusign.net/navigator/v1'
              }));
              
              // Redirect to home
              window.location.href = '${HOME_URL}';
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
    return NextResponse.redirect('/error?message=' + encodeURIComponent(error.message));
  }
}

export async function POST(request: Request) {
  const navigatorData = await request.json();
  
  // Initialize state machine with Navigator data
  const stateMachine = new ContractStateMachine(navigatorData);
  
  // Get current state and context
  const context = stateMachine.getContext();
  
  // Use the context to update your UI or database
  // ...

  return Response.json({ success: true, context });
} 