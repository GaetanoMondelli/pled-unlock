import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Default config values that can be overridden by environment variables
const DEFAULT_CONFIG = {
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || "",
  accountId: process.env.DOCUSIGN_ACCOUNT_ID || "",
  userId: process.env.DOCUSIGN_USER_ID || "",
  privateKey: process.env.DOCUSIGN_PRIVATE_KEY || "",
  oAuthServer: process.env.DOCUSIGN_OAUTH_SERVER || "account-d.docusign.com",
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI || "http://localhost:3000/callback",
};

export async function GET() {
  try {
    // Return the config, preferring environment variables over defaults
    return NextResponse.json({
      integrationKey: DEFAULT_CONFIG.integrationKey,
      accountId: DEFAULT_CONFIG.accountId,
      userId: DEFAULT_CONFIG.userId,
      privateKey: DEFAULT_CONFIG.privateKey,
      oAuthServer: DEFAULT_CONFIG.oAuthServer,
      redirectUri: DEFAULT_CONFIG.redirectUri,
    });
  } catch (error) {
    console.error("Error getting DocuSign config:", error);
    return NextResponse.json({ error: "Failed to get DocuSign configuration" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const configPath = path.join(process.cwd(), "app/api/docusign/config/jwtConfig.json");
    const privateKeyPath = path.join(process.cwd(), "app/api/docusign/config/private.key");

    // Transform UI config to match DocuSign format
    const configData = {
      dsJWTClientId: data.integrationKey,
      impersonatedUserGuid: data.userId,
      dsOauthServer: data.oAuthServer,
    };

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    // Save private key if provided
    if (data.privateKey) {
      fs.writeFileSync(privateKeyPath, data.privateKey);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving configuration:", error);
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
