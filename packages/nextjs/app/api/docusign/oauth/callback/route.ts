import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic'; // This marks the route as dynamic

export async function GET(req: NextRequest) {
  try {
    // Get the authorization code and state from the headers
    const headersList = headers();
    const url = headersList.get("x-url") || req.url;
    const searchParams = new URL(url).searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // Redirect to playground with success status
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/procedures/proc_123?tab=playground&consent=success&code=${code}`;

    return redirect(redirectUrl);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/procedures/proc_123?tab=playground&consent=error&message=${encodeURIComponent(error.message)}`;

    return redirect(redirectUrl);
  }
}
