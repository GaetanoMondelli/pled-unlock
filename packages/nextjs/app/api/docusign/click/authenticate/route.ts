import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Constants for API endpoints
const AUTH_BASE_URL = 'https://account-d.docusign.com';
const CLICK_BASE_URL = 'https://demo.docusign.net/clickapi/v1';
const REDIRECT_URI = 'http://localhost:3000/api/docusign/click/callback';
const PLAYGROUND_URL = 'http://localhost:3000/procedures/proc_123?tab=playground';

// Click-specific scopes
const CLICK_SCOPES = [
  'signature',
  'impersonation',
  'click.manage',
  'click.send'
];

export async function POST(req: NextRequest) {
  try {
    // Read configuration
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Read private key
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config', config.privateKeyLocation);
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
      aud: config.dsOauthServer.replace('https://', ''),
      iat: now,
      exp: now + 3600,
      scope: CLICK_SCOPES.join(' ')
    };

    const token = jwt.sign(jwtPayload, privateKey, { algorithm: 'RS256' });

    const response = await fetch(`${config.dsOauthServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': token
      })
    });

    const responseData = await response.json();

    if (responseData.error === 'consent_required') {
      const consentUrl = `${config.dsOauthServer}/oauth/auth` +
        `?response_type=code` +
        `&scope=${CLICK_SCOPES.join(' ')}` +
        `&client_id=${config.dsJWTClientId}`;

      return NextResponse.json({
        error: 'consent_required',
        consentUrl,
        message: 'User consent required'
      });
    }

    if (!response.ok) {
      throw new Error(responseData.error || 'Authentication failed');
    }

    const { access_token } = responseData;

    // Get user info
    const userResponse = await fetch(`${config.dsOauthServer}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const userInfo = await userResponse.json();
    const accountInfo = userInfo.accounts.find((acc: any) => acc.is_default);

    if (!accountInfo) {
      throw new Error('No default account found');
    }

    return NextResponse.json({
      accessToken: access_token,
      accountId: accountInfo.account_id,
      baseUrl: accountInfo.base_uri,
      type: 'click',
      scopes: responseData.scope ? responseData.scope.split(' ') : CLICK_SCOPES
    });

  } catch (error: any) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: error.status || 500 }
    );
  }
} 