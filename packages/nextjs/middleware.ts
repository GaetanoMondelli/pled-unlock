import { withAuth } from "next-auth/middleware";

// Export withAuth with simpler configuration
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  }
});

export const config = {
  matcher: [
    // Match everything except api/auth routes and static assets
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)'
  ],
}; 