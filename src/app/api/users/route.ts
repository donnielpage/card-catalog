import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageOrganizationUsers, isGlobalAdmin, isOrganizationAdmin } from '@/lib/auth';
import { DatabaseFactory } from '@/lib/database-factory';
import { withTenantContext } from '@/lib/tenant-middleware';
import { TenantContext } from '@/lib/database-pg';
import { GlobalRole, OrganizationRole } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check hierarchical permissions
  const globalRole = session.user.global_role as GlobalRole;
  const organizationRole = session.user.organization_role as OrganizationRole;
  const userTenantId = session.user.tenant_id;

  if (!canManageOrganizationUsers(globalRole, organizationRole, userTenantId, userTenantId)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const db = DatabaseFactory.getInstance({
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true'
  });
  
  try {
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    if (isGlobalAdmin(globalRole)) {
      // Global Admins can see all users across all organizations
      const sql = `
        SELECT 
          u.id, u.username, u.email, u.firstname, u.lastname, 
          u.role as global_role, u.tenant_role as organization_role, 
          u.tenant_id, u.favorite_team_id, u.favorite_player_id, 
          u.created_at, u.updated_at,
          t.name as organization_name, t.slug as organization_slug
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        ORDER BY u.created_at DESC
      `;
      const users = await db.all(sql);
      return NextResponse.json(users);
    } else if (isOrganizationAdmin(organizationRole)) {
      // Organization Admins can only see users in their organization
      const sql = isMultiTenant ? `
        SELECT 
          u.id, u.username, u.email, u.firstname, u.lastname, 
          u.role as global_role, u.tenant_role as organization_role,
          u.tenant_id, u.favorite_team_id, u.favorite_player_id, 
          u.created_at, u.updated_at,
          t.name as organization_name, t.slug as organization_slug
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.tenant_id = $1
        ORDER BY u.created_at DESC
      ` : `
        SELECT id, username, email, firstname, lastname, role, 
               favorite_team_id, favorite_player_id, created_at, updated_at 
        FROM users ORDER BY created_at DESC
      `;
      
      const users = isMultiTenant ? 
        await db.all(sql, [userTenantId]) :
        await db.all(sql);
      return NextResponse.json(users);
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check hierarchical permissions
  const globalRole = session.user.global_role as GlobalRole;
  const organizationRole = session.user.organization_role as OrganizationRole;
  const userTenantId = session.user.tenant_id;

  if (!canManageOrganizationUsers(globalRole, organizationRole, userTenantId, userTenantId)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const db = DatabaseFactory.getInstance({
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true'
  });
  
  try {
    const { 
      username, 
      email, 
      firstname, 
      lastname, 
      password, 
      global_role, 
      organization_role,
      target_tenant_id 
    } = await request.json();

    if (!username || !email || !firstname || !lastname || !password) {
      return NextResponse.json(
        { error: 'Username, email, firstname, lastname, and password are required' },
        { status: 400 }
      );
    }

    // Validate role assignments based on user permissions
    const finalGlobalRole = global_role || 'user';
    const finalOrganizationRole = organization_role || 'user';
    const finalTenantId = target_tenant_id || userTenantId;

    // Global Admins can create users in any organization with any role
    // Organization Admins can only create organization users in their own organization
    if (!isGlobalAdmin(globalRole)) {
      // Organization Admins have restrictions
      if (finalGlobalRole !== 'user') {
        return NextResponse.json(
          { error: 'Organization Admins can only create users with user global role' },
          { status: 403 }
        );
      }
      
      if (finalTenantId !== userTenantId) {
        return NextResponse.json(
          { error: 'Organization Admins can only create users in their own organization' },
          { status: 403 }
        );
      }
    }

    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    // Check if user already exists (organization-scoped for Org Admins)
    const checkUserSql = isMultiTenant ? 
      (isGlobalAdmin(globalRole) ? 
        'SELECT id FROM users WHERE username = $1 OR email = $2' :
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND tenant_id = $3'
      ) :
      'SELECT id FROM users WHERE username = ? OR email = ?';
    
    const checkParams = isMultiTenant ?
      (isGlobalAdmin(globalRole) ?
        [username, email] :
        [username, email, finalTenantId]
      ) :
      [username, email];
    
    const existingUser = await db.get(checkUserSql, checkParams);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this username or email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insertSql = isMultiTenant ? 
      'INSERT INTO users (username, email, firstname, lastname, password_hash, role, tenant_role, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id' :
      'INSERT INTO users (username, email, firstname, lastname, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)';
    
    const insertParams = isMultiTenant ?
      [username, email, firstname, lastname, passwordHash, finalGlobalRole, finalOrganizationRole, finalTenantId] :
      [username, email, firstname, lastname, passwordHash, finalGlobalRole];
    
    const result = await db.get(insertSql, insertParams) as any;
    const userId = result.id;

    const selectSql = isMultiTenant ?
      `SELECT 
        u.id, u.username, u.email, u.firstname, u.lastname, 
        u.role as global_role, u.tenant_role as organization_role,
        u.tenant_id, u.favorite_team_id, u.favorite_player_id, 
        u.created_at, u.updated_at,
        t.name as organization_name, t.slug as organization_slug
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1` :
      'SELECT id, username, email, firstname, lastname, role, favorite_team_id, favorite_player_id, created_at, updated_at FROM users WHERE id = ?';

    const newUser = await db.get(selectSql, [userId]);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}