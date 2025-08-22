import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageGlobalSystem, isGlobalAdmin } from '@/lib/auth';
import { DatabaseFactory } from '@/lib/database-factory';
import { GlobalRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const globalRole = session.user.global_role as GlobalRole;
  
  // Only Global Admins can manage tenants
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

    // Get all tenants with user counts (excluding system tenants and global admins from counts)
    const sql = `
      SELECT 
        t.id, t.name, t.slug, t.subscription_tier, t.max_users, 
        t.status, t.created_at,
        COUNT(CASE WHEN u.role != 'global_admin' THEN u.id END) as user_count,
        COUNT(CASE WHEN u.tenant_role = 'org_admin' THEN 1 END) as admin_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      WHERE t.id NOT IN ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001')
      GROUP BY t.id, t.name, t.slug, t.subscription_tier, t.max_users, t.status, t.created_at
      ORDER BY t.created_at DESC
    `;
    
    const tenants = await db.all(sql);
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const globalRole = session.user.global_role as GlobalRole;
  
  // Only Global Admins can create tenants
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

    const { name, slug, subscription_tier, max_users } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingTenant = await db.get('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (existingTenant) {
      return NextResponse.json(
        { error: 'A tenant with this slug already exists' },
        { status: 409 }
      );
    }

    // Create new tenant
    const insertSql = `
      INSERT INTO tenants (name, slug, subscription_tier, max_users, status) 
      VALUES ($1, $2, $3, $4, 'active') 
      RETURNING *
    `;
    
    const newTenant = await db.get(insertSql, [
      name, 
      slug, 
      subscription_tier || 'starter',
      max_users || 10
    ]);

    return NextResponse.json(newTenant, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}