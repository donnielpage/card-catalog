import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { GlobalRole, OrganizationRole } from "./types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Runtime security check: ensure proper secret is set in production
        if (process.env.NODE_ENV === 'production' && 
            (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === 'development-secret-fallback-for-builds')) {
          console.error('NEXTAUTH_SECRET not properly configured for production');
          console.error('Current NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set');
          console.error('NODE_ENV:', process.env.NODE_ENV);
          // Don't block authentication, just log the warning
        }

        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Import the auth service directly since we're in server-side context
          const { authenticateUser } = await import('./auth-service');
          
          const result = await authenticateUser(credentials.username, credentials.password);
          
          if (!result.user) {
            console.error("Authentication failed:", result.error);
            return null;
          }

          console.log("Authentication successful, user data:", result.user);
          return {
            id: result.user.id.toString(),
            username: result.user.username,
            email: result.user.email,
            firstname: result.user.firstname,
            lastname: result.user.lastname,
            role: result.user.role,
            global_role: result.user.global_role,
            organization_role: result.user.organization_role,
            tenant_id: result.user.tenant_id,
            tenant_name: result.user.tenant_name,
            tenant_slug: result.user.tenant_slug,
            favorite_team_id: result.user.favorite_team_id,
            favorite_player_id: result.user.favorite_player_id,
          };
        } catch (error) {
          console.error("Auth error:", error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for better security)
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.global_role = (user as any).global_role;
        token.organization_role = (user as any).organization_role;
        token.tenant_id = (user as any).tenant_id;
        token.tenant_name = (user as any).tenant_name;
        token.tenant_slug = (user as any).tenant_slug;
        token.username = user.username;
        token.firstname = user.firstname;
        token.lastname = user.lastname;
        token.favorite_team_id = user.favorite_team_id;
        token.favorite_player_id = user.favorite_player_id;
      }
      
      // Refresh user data periodically or when explicitly triggered
      if (trigger === 'update' || 
          (token.last_refresh && Date.now() - (token.last_refresh as number) > 60000)) { // 1 minute
        try {
          const { authenticateUser } = await import('./auth-service');
          const result = await authenticateUser(token.username as string, '', true); // Skip password check for refresh
          
          if (result.user) {
            token.favorite_team_id = result.user.favorite_team_id;
            token.favorite_player_id = result.user.favorite_player_id;
            token.last_refresh = Date.now();
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.global_role = token.global_role as GlobalRole;
        session.user.organization_role = token.organization_role as OrganizationRole;
        session.user.tenant_id = token.tenant_id as string;
        session.user.tenant_name = token.tenant_name as string;
        session.user.tenant_slug = token.tenant_slug as string;
        session.user.username = token.username as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.favorite_team_id = token.favorite_team_id as number | string;
        session.user.favorite_player_id = token.favorite_player_id as number | string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Use NEXTAUTH_URL as the base URL to ensure correct port
      const nextAuthUrl = process.env.NEXTAUTH_URL || baseUrl;
      
      // Redirect to home page after successful login
      if (url.startsWith('/')) return `${nextAuthUrl}${url}`;
      else if (new URL(url).origin === new URL(nextAuthUrl).origin) return url;
      return nextAuthUrl;
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.split('//')[1]?.split(':')[0] : undefined
      }
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-fallback-for-builds",
};

// Hierarchical Permission System
export const isGlobalAdmin = (globalRole: GlobalRole): boolean => {
  return globalRole === 'global_admin';
};

export const isGlobalOperator = (globalRole: GlobalRole): boolean => {
  return globalRole === 'global_operator';
};

export const isOrganizationAdmin = (organizationRole: OrganizationRole): boolean => {
  return organizationRole === 'org_admin';
};

export const canSwitchTenants = (globalRole: GlobalRole): boolean => {
  // Only Global Admins can switch between organizations
  return isGlobalAdmin(globalRole);
};

export const canManageGlobalSystem = (globalRole: GlobalRole): boolean => {
  // Only Global Admins can manage system-wide settings
  return isGlobalAdmin(globalRole);
};

export const canViewGlobalDashboards = (globalRole: GlobalRole): boolean => {
  // Global Admins and Global Operators can view system dashboards
  return isGlobalAdmin(globalRole) || isGlobalOperator(globalRole);
};

export const canManageOrganizationUsers = (
  globalRole: GlobalRole, 
  organizationRole: OrganizationRole,
  userTenantId: string,
  targetTenantId: string
): boolean => {
  // Global Admins can manage users in any organization
  if (isGlobalAdmin(globalRole)) {
    return true;
  }
  
  // Organization Admins can only manage users in their own organization
  return isOrganizationAdmin(organizationRole) && userTenantId === targetTenantId;
};

export const canCreateCards = (globalRole: GlobalRole, organizationRole: OrganizationRole): boolean => {
  // Global users cannot create cards - cards are organization-only
  if (isGlobalAdmin(globalRole) && !isOrganizationAdmin(organizationRole)) {
    return false;
  }
  
  // Any organization user can create cards
  return true;
};

export const canViewOrganizationData = (
  globalRole: GlobalRole,
  organizationRole: OrganizationRole, 
  userTenantId: string,
  dataTenantId: string
): boolean => {
  // Global Admins can view data from any organization
  if (isGlobalAdmin(globalRole)) {
    return true;
  }
  
  // Organization users can only view data from their own organization
  return userTenantId === dataTenantId;
};

// Legacy compatibility functions (deprecated)
export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  console.warn('hasPermission is deprecated, use hierarchical permission functions');
  
  const roleMap: Record<string, number> = {
    global_admin: 4,
    admin: 3, // legacy
    manager: 2, // legacy  
    user: 1,
  };

  const userLevel = roleMap[userRole] || 0;
  const requiredLevel = roleMap[requiredRole] || 0;

  return userLevel >= requiredLevel;
};

export const canCreate = (userRole: string): boolean => {
  return hasPermission(userRole, 'user');
};

export const canModify = (userRole: string): boolean => {
  return hasPermission(userRole, 'manager');
};

export const canManageUsers = (userRole: string): boolean => {
  return hasPermission(userRole, 'admin');
};