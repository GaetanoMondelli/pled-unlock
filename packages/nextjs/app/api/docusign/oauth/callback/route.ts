import { NextRequest } from "next/server";
import { redirect } from 'next/navigation';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization code and state from the URL
    const searchParams = new URL(req.url).searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    // Redirect to playground with success status
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/procedures/proc_123?tab=playground&consent=success&code=${code}`;
    
    return redirect(redirectUrl);

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/procedures/proc_123?tab=playground&consent=error&message=${encodeURIComponent(error.message)}`;
    
    return redirect(redirectUrl);
  }
} 