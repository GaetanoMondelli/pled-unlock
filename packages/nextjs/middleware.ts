import { withAuth } from "next-auth/middleware";

// Protect only the app sections that require auth. Homepage and static assets are public.
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ["/procedures/:path*", "/debug/:path*", "/blockexplorer/:path*", "/docusign-return/:path*"],
};
