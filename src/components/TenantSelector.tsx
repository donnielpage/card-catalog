'use client';

import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function TenantSelector() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { data: session } = useSession();
  const { 
    currentTenant, 
    isMultiTenant, 
    availableTenants, 
    loading, 
    switchTenant 
  } = useTenant();

  const handleTenantSelect = async (tenant: any) => {
    setIsDropdownOpen(false);
    await switchTenant(tenant);
  };

  // Don't render the selector if not in multi-tenant mode
  if (!isMultiTenant) {
    return null;
  }

  // Show current organization context as a badge (no dropdown for Global Admins)
  const displayTenant = (() => {
    if (session?.user?.global_role === 'global_admin') {
      return {
        id: 'global',
        name: 'Global',
        slug: 'global'
      };
    }
    return currentTenant || {
      id: session?.user?.tenant_id || 'default',
      name: session?.user?.tenant_name || 'Default Organization',
      slug: session?.user?.tenant_slug || 'default'
    };
  })();

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-600 rounded-lg text-sm text-slate-200">
      <span>🏢</span>
      <span className="font-medium">{displayTenant.name}</span>
      {session?.user?.global_role === 'global_admin' && (
        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">
          Context
        </span>
      )}
    </div>
  );
}