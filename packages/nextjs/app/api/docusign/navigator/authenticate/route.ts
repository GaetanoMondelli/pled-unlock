import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Constants for API endpoints
const AUTH_BASE_URL = 'https://account-d.docusign.com';
// For demo/dev environment use api-d, for production use api
const NAVIGATOR_BASE_URL = 'https://api-d.docusign.com/v1';
const REDIRECT_URI = 'http://localhost:3000/api/docusign/navigator/callback';
const PLAYGROUND_URL = 'http://localhost:3000/procedures/proc_123?tab=playground';

// Navigator-specific scopes - exactly as documented
const NAVIGATOR_SCOPES = [
  'signature',
  'impersonation',
  'adm_store_unified_repo_read',  // Required to read agreement data
  'models_read',                   // For forward compatibility
  'click.manage',
  'click.send'
];

export async function POST(req: NextRequest) {
  try {
    // Get requested scopes from the request body
    const body = await req.json().catch(() => ({}));
    const requestedScopes = body.scopes || NAVIGATOR_SCOPES;

    // Read configuration
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Get JWT token
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config', config.privateKeyLocation);
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
      .replace(/\\n/g, '\n')
      .replace(/^\s+|\s+$/g, '');

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: config.dsJWTClientId,
      sub: config.impersonatedUserGuid,
      aud: config.dsOauthServer.replace('https://', ''),
      iat: now,
      exp: now + 3600,
      scope: requestedScopes.join(' ')  // Use the requested scopes
    };

    const assertion = jwt.sign(jwtPayload, privateKey, { algorithm: 'RS256' });

    // Get access token
    const tokenResponse = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion
      })
    });

    const tokenData = await tokenResponse.json();

    console.log('[Navigator Auth] Token response:', {
      type: tokenData.token_type,
      scopes: tokenData.scope,
      expires: tokenData.expires_in,
      tokenStart: tokenData.access_token?.substring(0, 20) + '...'
    });

    if (tokenData.error === 'consent_required') {
      console.log('[Navigator Auth] Consent required, redirecting to consent flow');
      
      const consentUrl = `${config.dsOauthServer}/oauth/auth?` + new URLSearchParams({
        'response_type': 'code',
        'scope': requestedScopes.join(' '),
        'client_id': config.dsJWTClientId,
        'redirect_uri': REDIRECT_URI,
        'state': PLAYGROUND_URL,
        'prompt': 'consent'
      });

      return NextResponse.json({ error: 'Consent required', consentUrl });
    }

    // Get the actual granted scopes from the token response
    const grantedScopes = tokenData.scope ? tokenData.scope.split(' ') : requestedScopes;

    // Verify we have the required Navigator scope
    if (!grantedScopes.includes('adm_store_unified_repo_read')) {
      console.error('[Navigator Auth] Token missing Navigator scope:', grantedScopes);
      throw new Error('Token missing required Navigator scope');
    }

    // Get user info from correct endpoint
    const userInfoResponse = await fetch(`${AUTH_BASE_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const userInfo = await userInfoResponse.json();
    
    // Get the default account ID
    const accountId = userInfo.accounts?.find(acc => acc.is_default)?.account_id;
    
    if (!accountId) {
      throw new Error('Could not get account ID from user info');
    }

    console.log('[Navigator Auth] User info:', {
      name: userInfo.name,
      email: userInfo.email,
      accountId
    });

    console.log('[Navigator Auth] Final response:', {
      tokenStart: tokenData.access_token?.substring(0, 20) + '...',
      accountId,
      baseUrl: NAVIGATOR_BASE_URL,
      scopes: grantedScopes
    });

    return NextResponse.json({
      accessToken: tokenData.access_token,
      accountId,
      baseUrl: NAVIGATOR_BASE_URL,
      scopes: grantedScopes  // Return the actual granted scopes from the token
    });

  } catch (error: any) {
    console.error('[Navigator Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Navigator authentication failed' },
      { status: 500 }
    );
  }
} 
