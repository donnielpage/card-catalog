import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageGlobalSystem } from '@/lib/auth';
import { DatabaseFactory } from '@/lib/database-factory';
import { GlobalRole } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const globalRole = session.user.global_role as GlobalRole;
  
  // Only Global Admins can view tenant details
  if (!canManageGlobalSystem(globalRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const db = DatabaseFactory.getInstance({
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true'
  });
  
  try {
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    if (!isMultiTenant) {
      return NextResponse.json({ error: 'Multi-tenant mode not enabled' }, { status: 400 });
    }

    const resolvedParams = await params;
    const tenantId = resolvedParams.id;

    // Get tenant details with user information
    const tenantSql = `
      SELECT 
        t.id, t.name, t.slug, t.subscription_tier, t.max_users, 
        t.status, t.created_at,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.tenant_role = 'org_admin' THEN 1 END) as admin_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      WHERE t.id = $1
      GROUP BY t.id, t.name, t.slug, t.subscription_tier, t.max_users, t.status, t.created_at
    `;
    
    const tenant = await db.get(tenantSql, [tenantId]);
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get tenant users
    const usersSql = `
      SELECT 
        id, username, email, firstname, lastname, 
        role as global_role, tenant_role as organization_role,
        favorite_team_id, favorite_player_id, created_at, updated_at
      FROM users
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;
    
    const users = await db.all(usersSql, [tenantId]);

    return NextResponse.json({
      tenant,
      users
    });
  } catch (error) {
    console.error('Error fetching tenant details:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant details' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const globalRole = session.user.global_role as GlobalRole;
  
  // Only Global Admins can update tenants
  if (!canManageGlobalSystem(globalRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const db = DatabaseFactory.getInstance({
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true'
  });
  
  try {
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    if (!isMultiTenant) {
      return NextResponse.json({ error: 'Multi-tenant mode not enabled' }, { status: 400 });
    }

    const resolvedParams = await params;
    const tenantId = resolvedParams.id;
    const { name, subscription_tier, max_users, status } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update tenant
    const updateSql = `
      UPDATE tenants 
      SET name = $1, subscription_tier = $2, max_users = $3, status = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    
    const updatedTenant = await db.get(updateSql, [
      name, 
      subscription_tier || 'starter',
      max_users || 10,
      status || 'active',
      tenantId
    ]);

    if (!updatedTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTenant);
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}