import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import jwt from "jsonwebtoken";

// OAuth endpoints
const AUTH_BASE_URL = 'https://account-d.docusign.com';
const API_BASE_URL = 'https://demo.docusign.net/restapi/v2.1';
const CLICK_API_BASE_URL = 'https://demo.docusign.net/clickapi/v1';

// Define all possible scopes in the correct order
const ALL_SCOPES = [
  'signature',
  'impersonation',
  'click.manage',
  'click.send',
  'adm_store_unified_repo_read',
  'models_read'
];

const OAUTH_REDIRECT_URI = '';  // Empty since we'll use root

export async function POST(req: NextRequest) {
  try {
    // Get requested scopes
    const body = await req.json().catch(() => ({}));
    const requestedScopes = body.scopes || ['signature'];
    
    // Always use all scopes to avoid multiple consent requests
    let scopes = ALL_SCOPES;

    // Read configuration
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Read private key using the privateKeyLocation from config
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
      scope: scopes.join(' ')
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

    // Handle consent_required error
    if (responseData.error === 'consent_required') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const redirectUri = baseUrl;  // Just use the base URL
      
      // Use exact scope order and format
      const consentUrl = `${config.dsOauthServer}/oauth/auth` + 
        `?response_type=code` +
        `&scope=${scopes.join(' ')}` +
        `&client_id=${config.dsJWTClientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${Math.random().toString(36).substring(7)}`;
      
      return NextResponse.json({
        error: 'consent_required',
        consentUrl,
        message: 'User consent required. Please visit the consent URL.'
      }, { status: 401 });
    }

    if (!response.ok) {
      throw new Error(responseData.error || 'Authentication failed');
    }

    const { access_token } = responseData;

    // Get user info
    const userResponse = await fetch(`${AUTH_BASE_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userResponse.json();
    const accountInfo = userInfo.accounts.find((acc: any) => acc.is_default);

    if (!accountInfo) {
      throw new Error('No default account found');
    }

    // Determine the API type based on requested scopes
    const apiType = requestedScopes.includes('click.manage') ? 'click' : 
                   requestedScopes.includes('adm_store_unified_repo_read') ? 'navigator' : 
                   'esignature';

    // Determine the appropriate base URL
    let baseUrl = accountInfo.base_uri;
    if (apiType === 'click') {
      baseUrl = CLICK_API_BASE_URL;
    }

    return NextResponse.json({
      accessToken: access_token,
      accountId: accountInfo.account_id,
      baseUrl,
      type: apiType,
      scopes
    });

  } catch (error: any) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: error.status || 500 }
    );
  }
} 