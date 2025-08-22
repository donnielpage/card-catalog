import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TenantContext } from '@/lib/database-pg';

export interface TenantDetectionResult {
  tenantContext: TenantContext | null;
  isMultiTenant: boolean;
  error?: string;
}

export async function detectTenant(request: NextRequest): Promise<TenantDetectionResult> {
  const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
  
  if (!isMultiTenant) {
    return {
      tenantContext: null,
      isMultiTenant: false
    };
  }

  try {
    // Get session to determine user's tenant
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return {
        tenantContext: null,
        isMultiTenant: true,
        error: 'Authentication required for tenant detection'
      };
    }

    // For now, use a default tenant until we implement proper tenant assignment
    // In production, this would come from the user's profile or subdomain/path detection
    const defaultTenantContext: TenantContext = {
      tenantId: '00000000-0000-0000-0000-000000000001', // Default tenant UUID
      tenantSlug: 'default',
      tenantName: 'Default Organization'
    };

    // TODO: Future enhancements:
    // 1. Extract tenant from subdomain (tenant.cardvault.com)
    // 2. Extract tenant from path (/tenant-slug/...)
    // 3. Look up user's tenant from database
    // 4. Support multiple tenant membership

    return {
      tenantContext: defaultTenantContext,
      isMultiTenant: true
    };

  } catch (error) {
    return {
      tenantContext: null,
      isMultiTenant: true,
      error: `Tenant detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function withTenantContext<T>(
  request: NextRequest,
  handler: (tenantResult: TenantDetectionResult) => Promise<T>
): Promise<T> {
  const tenantResult = await detectTenant(request);
  return await handler(tenantResult);
}