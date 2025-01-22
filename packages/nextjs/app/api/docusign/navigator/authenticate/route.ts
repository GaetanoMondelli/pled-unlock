import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const AUTH_BASE_URL = 'https://account-d.docusign.com';
const PLAYGROUND_URL = 'http://localhost:3000/procedures/proc_123?tab=playground';  // Match the hardcoded URL
const DEMO_BASE_URL = 'https://demo.docusign.net/restapi/v2.1';

// Update the base URL constant to match the documentation
const NAVIGATOR_BASE_URL = "https://api-d.docusign.com/v1";  // Developer environment base URL

// Add getConfig function
function getConfig() {
  const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
  console.log('[Navigator Auth] Reading config from:', configPath);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Base DocuSign scopes
const BASE_SCOPES = ['signature', 'impersonation'];

// Navigator-specific scopes
const NAVIGATOR_SCOPES = [
  'signature',
  'impersonation',
  'extended',
  'adm_store_unified_repo_read',
  'models_read',
  'navigator.read'  // Add Navigator-specific scope
];

// Add a function to get the consent URL
function getConsentUrl(config: any) {
  const scopes = encodeURIComponent(NAVIGATOR_SCOPES.join(' '));
  // Add prompt=login to force authentication and prompt=consent to force consent dialog
  return `${AUTH_BASE_URL}/oauth/auth?` +
    `response_type=code&` +
    `scope=${scopes}&` +
    `client_id=${config.dsJWTClientId}&` +
    `redirect_uri=http://localhost:3000/api/docusign/navigator/callback&` +
    `state=${encodeURIComponent(PLAYGROUND_URL)}&` +
    `prompt=login consent`;  // Force both login and consent
}

async function getToken(config: any) {
  try {
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config/private.key');
    let privateKey = fs.readFileSync(privateKeyPath, 'utf8')
      .replace(/\\n/g, '\n')
      .replace(/^\s+|\s+$/g, '');
    
    if (!privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
    }

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: config.dsJWTClientId,
      sub: config.impersonatedUserGuid,
      iat: now,
      exp: now + 3600,
      aud: config.dsOauthServer.replace('https://', ''),
      scope: NAVIGATOR_SCOPES.join(' ')
    };

    console.log('[Navigator Auth] JWT Payload:', jwtPayload);

    const assertion = jwt.sign(jwtPayload, privateKey, {
      algorithm: 'RS256'
    });

    const tokenResponse = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion
      })
    });

    const responseText = await tokenResponse.text();
    console.log('[Navigator Auth] Token response:', {
      status: tokenResponse.status,
      text: responseText
    });

    if (!tokenResponse.ok) {
      const parsed = JSON.parse(responseText);
      if (parsed.error === 'consent_required') {
        const consentUrl = getConsentUrl(config);
        throw new Error('consent_required');
      }
      throw new Error(`Authentication failed: ${responseText}`);
    }

    return JSON.parse(responseText).access_token;
  } catch (error: any) {
    if (error.message === 'consent_required') {
      throw error;
    }
    console.error('[Navigator Auth] Token error:', error);
    throw new Error(`Failed to get token: ${error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const config = getConfig();
    
    try {
      // Check if we have consent stored
      const token = await getToken(config);
      
      if (typeof token === 'string') {
        const response = {
          accessToken: token,
          accountId: config.impersonatedUserGuid,
          baseUrl: NAVIGATOR_BASE_URL,
          type: 'navigator',
          hasConsent: true
        };

        return NextResponse.json(response);
      }
    } catch (e: any) {
      if (e.message === 'consent_required') {
        const consentUrl = getConsentUrl(config);
        return NextResponse.json({
          error: 'Consent required',
          consentUrl,
          isNewConsent: true
        });
      }
      throw e;
    }

  } catch (error: any) {
    console.error('[Navigator Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Navigator authentication failed' },
      { status: 500 }
    );
  }
} 
