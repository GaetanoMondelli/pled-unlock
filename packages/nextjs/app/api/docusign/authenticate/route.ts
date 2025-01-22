import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// OAuth endpoints
const AUTH_BASE_URL = 'https://account-d.docusign.com';  // For authentication
const API_BASE_URL = 'https://demo.docusign.net/restapi/v2.1';  // For API calls

const SCOPES = ['signature', 'impersonation'];
const NAVIGATOR_SCOPES = [
  'adm_store_unified_repo_read',  // Only this scope is required for Navigator API
  'models_read'  // Best practice for forward compatibility
];

export async function POST(req: Request) {
  try {
    // Make scope parameter optional
    let scope = undefined;
    let isNavigator = false;
    
    // Only try to parse JSON if there's a body
    if (req.body) {
      try {
        const body = await req.json();
        scope = body.scope;
        isNavigator = scope === 'adm_store_unified_repo_read';
      } catch (e) {
        console.log('No JSON body, assuming regular authentication');
      }
    }

    // Read configuration
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Read private key
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config/private.key');
    let privateKey = fs.readFileSync(privateKeyPath, 'utf8')
      .replace(/\\n/g, '\n')
      .replace(/^\s+|\s+$/g, '');
    
    if (!privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
    }

    // Create JWT token with appropriate claims
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: config.dsJWTClientId,
      sub: config.impersonatedUserGuid,
      iat: now,
      exp: now + 3600,
      aud: config.dsOauthServer.replace('https://', ''),
      scope: isNavigator 
        ? NAVIGATOR_SCOPES.join(' ')
        : SCOPES.join(' ')
    };

    console.log('JWT Payload:', jwtPayload);

    const assertion = jwt.sign(jwtPayload, privateKey, {
      algorithm: 'RS256'
    });

    // Use the correct OAuth endpoint for authentication
    const tokenUrl = `${AUTH_BASE_URL}/oauth/token`;
    console.log('Token URL:', tokenUrl);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token response error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText
      });
      throw new Error(`Authentication failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received successfully');

    // For Navigator API, return the token directly
    if (isNavigator) {
      return NextResponse.json({
        accessToken: tokenData.access_token,
        accountId: config.impersonatedUserGuid // Navigator API might use the user GUID as account ID
      });
    }

    // For regular API, get account info
    const userInfoResponse = await fetch(`${AUTH_BASE_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();
    const account = userInfo.accounts.find((acc: any) => acc.is_default === true);
    
    if (!account) {
      throw new Error('No default account found');
    }

    return NextResponse.json({
      accessToken: tokenData.access_token,
      accountId: account.account_id
    });

  } catch (error: any) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
} 