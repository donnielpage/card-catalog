'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_tier?: string;
  max_users?: number;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  isMultiTenant: boolean;
  availableTenants: Tenant[];
  loading: boolean;
  switchTenant: (tenant: Tenant) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isMultiTenant, setIsMultiTenant] = useState(false);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  // Initialize tenant context
  useEffect(() => {
    initializeTenantContext();
  }, []);

  // Re-detect tenant when session changes
  useEffect(() => {
    if (session && isMultiTenant) {
      detectCurrentTenant();
    }
  }, [session, isMultiTenant]);

  const initializeTenantContext = async () => {
    try {
      // Check if multi-tenant mode is enabled
      const appInfoResponse = await fetch('/api/app-info');
      if (appInfoResponse.ok) {
        const appInfo = await appInfoResponse.json();
        setIsMultiTenant(appInfo.isMultiTenant || false);
        
        if (appInfo.isMultiTenant) {
          await loadAvailableTenants();
          await detectCurrentTenant();
        } else {
          // Single tenant mode - set default
          setCurrentTenant({
            id: 'single',
            name: 'CardVault',
            slug: 'single'
          });
        }
      }
    } catch (error) {
      console.error('Error initializing tenant context:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      if (response.ok) {
        const tenants = await response.json();
        setAvailableTenants(tenants);
      }
    } catch (error) {
      console.error('Error loading available tenants:', error);
      setAvailableTenants([]);
    }
  };

  const detectCurrentTenant = async () => {
    try {
      // Priority 1: Use user's assigned tenant from session (for Organization Users)
      if (session?.user?.tenant_id && session?.user?.global_role !== 'global_admin') {
        const userTenant = {
          id: session.user.tenant_id,
          name: session.user.tenant_name || 'Organization',
          slug: session.user.tenant_slug || 'org'
        };
        setCurrentTenant(userTenant);
        localStorage.setItem('cardvault_current_tenant', userTenant.slug);
        return;
      }
      
      // Priority 2: For Global Admins, check localStorage for last selected tenant
      if (session?.user?.global_role === 'global_admin') {
        const savedTenantSlug = localStorage.getItem('cardvault_current_tenant');
        
        if (savedTenantSlug && availableTenants.length > 0) {
          const savedTenant = availableTenants.find(t => t.slug === savedTenantSlug);
          if (savedTenant) {
            setCurrentTenant(savedTenant);
            return;
          }
        }
        
        // Priority 3: Default to first available tenant for Global Admins
        if (availableTenants.length > 0) {
          const defaultTenant = availableTenants.find(t => t.slug === 'default') || availableTenants[0];
          setCurrentTenant(defaultTenant);
          localStorage.setItem('cardvault_current_tenant', defaultTenant.slug);
        }
      }
    } catch (error) {
      console.error('Error detecting current tenant:', error);
    }
  };

  const switchTenant = async (tenant: Tenant) => {
    setCurrentTenant(tenant);
    
    // Save to localStorage
    localStorage.setItem('cardvault_current_tenant', tenant.slug);
    
    // In the future, this would:
    // 1. Update the JWT token with new tenant context
    // 2. Redirect to tenant-specific URL if using subdomain/path routing
    // 3. Clear any tenant-specific cached data
    // 4. Refresh the page or update app state
    
    // For now, just show a notification
    console.log(`Switched to tenant: ${tenant.name} (@${tenant.slug})`);
  };

  const refreshTenants = async () => {
    if (isMultiTenant) {
      await loadAvailableTenants();
    }
  };

  // Re-detect current tenant when available tenants change (only for Global Admins)
  useEffect(() => {
    if (isMultiTenant && availableTenants.length > 0 && !currentTenant && session?.user?.global_role === 'global_admin') {
      detectCurrentTenant();
    }
  }, [availableTenants, isMultiTenant, currentTenant, session?.user?.global_role]);

  const contextValue: TenantContextType = {
    currentTenant,
    isMultiTenant,
    availableTenants,
    loading,
    switchTenant,
    refreshTenants
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export default TenantContext;