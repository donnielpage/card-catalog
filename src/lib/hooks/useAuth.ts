'use client';

import { useSession } from 'next-auth/react';

// Client-side permission checking
const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    admin: 3,
    manager: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

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

  return {
    isAuthenticated,
    isLoading,
    user,
    userRole,
    canCreate: isAuthenticated && canCreate(userRole),
    canModify: isAuthenticated && canModify(userRole),
    canManageUsers: isAuthenticated && canManageUsers(userRole),
    session,
  };
}