import { getServerSession } from 'next-auth';
import type { NextAuthOptions, Session } from 'next-auth';
import { options as nextAuthOptions } from '@/app/api/configAuth';
import type { AuthProvider, UserIdentity } from '@/lib/platform/ports';

export class NextAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<UserIdentity | null> {
    const session = (await getServerSession(nextAuthOptions as NextAuthOptions)) as Session | null;
    if (!session || !('user' in session) || !session.user) return null;
    return {
      id: (session.user as any).id || session.user.email || 'anonymous',
      email: session.user.email,
      name: session.user.name,
      roles: (session as any).roles || [],
    };
  }

  async requireUser(): Promise<UserIdentity> {
    const u = await this.getCurrentUser();
    if (!u) throw new Error('Unauthorized');
    return u;
  }
}
