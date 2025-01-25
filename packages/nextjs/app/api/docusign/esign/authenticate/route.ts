import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Constants for API endpoints
const AUTH_BASE_URL = 'https://account-d.docusign.com';
const ESIGN_BASE_URL = 'https://demo.docusign.net/restapi/v2.1';
const REDIRECT_URI = 'http://localhost:3000/api/docusign/esign/callback';
const PLAYGROUND_URL = 'http://localhost:3000/procedures/proc_123?tab=playground';

// eSignature-specific scopes
const ESIGN_SCOPES = [
  'signature',
  'impersonation',
  'extended'
];

export async function POST(req: NextRequest) {
  try {
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
      scope: ESIGN_SCOPES.join(' ')
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

    if (tokenData.error === 'consent_required') {
      console.log('[eSign Auth] Consent required, redirecting to consent flow');
      
      const consentUrl = `${config.dsOauthServer}/oauth/auth?` + new URLSearchParams({
        'response_type': 'code',
        'scope': ESIGN_SCOPES.join(' '),
        'client_id': config.dsJWTClientId,
        'redirect_uri': REDIRECT_URI,
        'state': PLAYGROUND_URL,
        'prompt': 'consent'  // Force consent prompt even if previously granted
      });

      return NextResponse.json({ 
        error: 'consent_required', 
        consentUrl,
        message: 'User consent required for eSignature API access'
      });
    }

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error || 'Failed to get access token');
    }

    // Get user info
    const userInfoResponse = await fetch(`${AUTH_BASE_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const userInfo = await userInfoResponse.json();
    const accountId = userInfo.accounts?.find(acc => acc.is_default)?.account_id;
    
    if (!accountId) {
      throw new Error('Could not get account ID from user info');
    }

    return NextResponse.json({
      accessToken: tokenData.access_token,
      accountId,
      baseUrl: ESIGN_BASE_URL,
      scopes: ESIGN_SCOPES
    });

  } catch (error: any) {
    console.error('[eSign Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'eSignature authentication failed' },
      { status: 500 }
    );
  }
} 