import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const BASE_URL = 'https://account-d.docusign.com';
const SCOPES = ['signature', 'impersonation'];

export async function POST(request: Request) {
  try {
    // Read configuration from config folder
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    console.log('Reading config from:', configPath);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Config loaded:', { ...config, privateKey: '[REDACTED]' });

    // Read private key from config folder
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config/private.key');
    console.log('Reading private key from:', privateKeyPath);
    let privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    // Clean up the private key - ensure proper PEM format
    privateKey = privateKey
      .replace(/\\n/g, '\n')
      .replace(/^\s+|\s+$/g, '');
    
    if (!privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
    }

    // Create JWT token
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: config.dsJWTClientId,
      sub: config.impersonatedUserGuid,
      iat: now,
      exp: now + 3600,
      aud: config.dsOauthServer.replace('https://', ''),
      scope: SCOPES.join(' ')
    };
    console.log('JWT payload:', jwtPayload);

    try {
      const assertion = jwt.sign(jwtPayload, privateKey, {
        algorithm: 'RS256'
      });
      console.log('JWT token created successfully');

      // Get access token
      console.log('Requesting access token...');
      const tokenUrl = `${BASE_URL}/oauth/token`;
      const tokenBody = new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion
      });

      console.log('Token request:', {
        url: tokenUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenBody.toString()
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenBody
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token response error:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          body: errorText,
          headers: Object.fromEntries(tokenResponse.headers.entries())
        });
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(
            errorJson.error_description || 
            errorJson.error || 
            `Authentication failed: ${tokenResponse.status} ${tokenResponse.statusText}`
          );
        } catch (e) {
          throw new Error(`Authentication failed: ${tokenResponse.status} ${tokenResponse.statusText}\n${errorText}`);
        }
      }

      const tokenData = await tokenResponse.json();
      console.log('Token received:', { ...tokenData, access_token: '[REDACTED]' });

      // Get user info to get account ID
      console.log('Getting user info...');
      const userInfoResponse = await fetch(`${BASE_URL}/oauth/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('UserInfo response error:', {
          status: userInfoResponse.status,
          statusText: userInfoResponse.statusText,
          body: errorText,
          headers: Object.fromEntries(userInfoResponse.headers.entries())
        });
        throw new Error('Failed to get user info');
      }

      const userInfo = await userInfoResponse.json();
      console.log('User info received:', userInfo);

      const account = userInfo.accounts.find((acc: any) => acc.is_default === true);
      if (!account) {
        throw new Error('No default account found');
      }

      return NextResponse.json({
        accessToken: tokenData.access_token,
        accountId: account.account_id
      });
    } catch (jwtError: unknown) {
      if (jwtError instanceof Error) {
        console.error('JWT signing error:', jwtError);
        throw new Error(`Failed to create JWT token: ${jwtError.message}`);
      } else {
        console.error('JWT signing error:', jwtError);
        throw new Error('Failed to create JWT token: Unknown error');
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { 
          error: error.message || 'Authentication failed',
          details: error.stack
        },
        { status: 500 }
      );
    } else {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { 
          error: 'Authentication failed: Unknown error',
          details: 'No stack trace available'
        },
        { status: 500 }
      );
    }
  }
} 