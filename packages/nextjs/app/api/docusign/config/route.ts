import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Read configuration from config folder
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Read private key from config folder
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config/private.key');
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    // Transform config to match UI expectations
    return NextResponse.json({
      integrationKey: config.dsJWTClientId,
      userId: config.impersonatedUserGuid,
      accountId: "", // Will be populated after authentication
      oAuthServer: config.dsOauthServer,
      privateKey
    });
  } catch (error: any) {
    console.error('Error reading configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const configPath = path.join(process.cwd(), 'app/api/docusign/config/jwtConfig.json');
    const privateKeyPath = path.join(process.cwd(), 'app/api/docusign/config/private.key');

    // Transform UI config to match DocuSign format
    const configData = {
      dsJWTClientId: data.integrationKey,
      impersonatedUserGuid: data.userId,
      dsOauthServer: data.oAuthServer
    };

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    // Save private key if provided
    if (data.privateKey) {
      fs.writeFileSync(privateKeyPath, data.privateKey);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
} 