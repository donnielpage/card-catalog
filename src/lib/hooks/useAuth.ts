'use client';

import { useSession } from 'next-auth/react';
import { GlobalRole, OrganizationRole } from '@/lib/types';

// Hierarchical Permission System (client-side)
const isGlobalAdmin = (globalRole?: GlobalRole): boolean => {
  return globalRole === 'global_admin';
};

const isGlobalOperator = (globalRole?: GlobalRole): boolean => {
  return globalRole === 'global_operator';
};

const isOrganizationAdmin = (organizationRole?: OrganizationRole): boolean => {
  return organizationRole === 'org_admin';
};

const canSwitchTenants = (globalRole?: GlobalRole): boolean => {
  return isGlobalAdmin(globalRole);
};

const canManageGlobalSystem = (globalRole?: GlobalRole): boolean => {
  return isGlobalAdmin(globalRole);
};

const canViewGlobalDashboards = (globalRole?: GlobalRole): boolean => {
  return isGlobalAdmin(globalRole) || isGlobalOperator(globalRole);
};

const canManageOrganizationUsers = (
  globalRole?: GlobalRole, 
  organizationRole?: OrganizationRole
): boolean => {
  return isGlobalAdmin(globalRole) || isOrganizationAdmin(organizationRole);
};

const canCreateCards = (globalRole?: GlobalRole, organizationRole?: OrganizationRole): boolean => {
  // Global users without org role cannot create cards
  if (isGlobalAdmin(globalRole) && !isOrganizationAdmin(organizationRole)) {
    return false;
  }
  
  // Any organization user can create cards
  return true;
};

// Legacy compatibility functions
const hasPermission = (userRole: string, requiredRole: string): boolean => {
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

const canCreate = (userRole: string): boolean => {
  return hasPermission(userRole, 'user');
};

const canModify = (userRole: string): boolean => {
  return hasPermission(userRole, 'manager');
};

const canManageUsers = (userRole: string): boolean => {
  return hasPermission(userRole, 'admin');
};

export function useAuth() {
  const { data: session, status } = useSession();

  const isAuthenticated = status === 'authenticated' && !!session;
  const isLoading = status === 'loading';
  
  const user = session?.user;
  const userRole = user?.role || '';
  const globalRole = user?.global_role;
  const organizationRole = user?.organization_role;

  return {
    isAuthenticated,
    isLoading,
    user,
    userRole,
    globalRole,
    organizationRole,
    
    // Hierarchical permissions
    isGlobalAdmin: isAuthenticated && isGlobalAdmin(globalRole),
    isGlobalOperator: isAuthenticated && isGlobalOperator(globalRole),
    isOrganizationAdmin: isAuthenticated && isOrganizationAdmin(organizationRole),
    canSwitchTenants: isAuthenticated && canSwitchTenants(globalRole),
    canManageGlobalSystem: isAuthenticated && canManageGlobalSystem(globalRole),
    canViewGlobalDashboards: isAuthenticated && canViewGlobalDashboards(globalRole),
    canManageOrganizationUsers: isAuthenticated && canManageOrganizationUsers(globalRole, organizationRole),
    canCreateCards: isAuthenticated && canCreateCards(globalRole, organizationRole),
    
    // Legacy permissions (for backwards compatibility)
    canCreate: isAuthenticated && canCreate(userRole),
    canModify: isAuthenticated && canModify(userRole),
    canManageUsers: isAuthenticated && canManageUsers(userRole),
    
    session,
  };
}