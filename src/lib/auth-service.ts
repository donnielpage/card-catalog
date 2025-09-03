// Server-only authentication service
// This file handles database operations for authentication
import bcrypt from "bcryptjs";
import { DatabaseFactory } from "./database-factory";
import { HierarchicalUser, GlobalRole, OrganizationRole } from "./types";

export interface AuthResult {
  user: HierarchicalUser | null;
  error?: string;
}

export async function authenticateUser(username: string, password: string, isRefresh = false): Promise<AuthResult> {
  if (!username || (!password && !isRefresh)) {
    return { user: null, error: 'Username and password are required' };
  }

  const db = DatabaseFactory.getInstance({
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true'
  });
  
  try {
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    // Query includes tenant information for hierarchical roles and status
    const userQuery = isMultiTenant ? `
      SELECT 
        u.id, u.username, u.email, u.firstname, u.lastname, 
        u.password_hash, u.role, u.tenant_role, u.tenant_id,
        u.favorite_team_id, u.favorite_player_id, u.created_at, u.updated_at,
        t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE LOWER(u.username) = LOWER($1)
    ` : `
      SELECT id, username, email, firstname, lastname, password_hash, role, 
             favorite_team_id, favorite_player_id, created_at, updated_at 
      FROM users WHERE LOWER(username) = LOWER(?)
    `;
    
    const user = await db.get(userQuery, [username]) as any;

    if (!user) {
      return { user: null, error: 'Invalid credentials' };
    }

    // Skip password validation for refresh operations
    if (!isRefresh) {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return { user: null, error: 'Invalid credentials' };
      }
    }

    // Check organization status for multi-tenant users
    if (isMultiTenant && user.tenant_id) {
      const tenantStatus = user.tenant_status;
      
      if (tenantStatus === 'inactive') {
        return { user: null, error: 'Your organization is currently inactive. Please contact your administrator.' };
      }
      
      if (tenantStatus === 'suspended') {
        return { user: null, error: 'Your organization has been suspended. Please contact support for assistance.' };
      }
      
      // Only allow active organizations and global admin users (who might not have a tenant)
      if (tenantStatus && tenantStatus !== 'active' && user.role !== 'global_admin') {
        return { user: null, error: 'Your organization status does not allow access at this time.' };
      }
    }

    // Return user with hierarchical role information
    const hierarchicalUser: HierarchicalUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      password_hash: user.password_hash,
      role: user.role || 'user',
      tenant_id: user.tenant_id?.toString(),
      tenant_role: user.tenant_role || 'user',
      global_role: user.role || 'user',
      organization_role: user.tenant_role || 'user',
      tenant_name: user.tenant_name,
      tenant_slug: user.tenant_slug,
      tenant_status: user.tenant_status,
      favorite_team_id: user.favorite_team_id,
      favorite_player_id: user.favorite_player_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return { user: hierarchicalUser };
  } catch (error) {
    console.error("Auth error:", error instanceof Error ? error.message : 'Unknown error');
    return { user: null, error: 'Authentication failed' };
  }
}

export async function getUserById(id: string): Promise<HierarchicalUser | null> {
  const db = DatabaseFactory.getInstance({
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true'
  });
  
  try {
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    const userQuery = isMultiTenant ? `
      SELECT 
        u.id, u.username, u.email, u.firstname, u.lastname, 
        u.password_hash, u.role, u.tenant_role, u.tenant_id,
        u.favorite_team_id, u.favorite_player_id, u.created_at, u.updated_at,
        t.name as tenant_name, t.slug as tenant_slug
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    ` : `
      SELECT id, username, email, firstname, lastname, password_hash, role, 
             favorite_team_id, favorite_player_id, created_at, updated_at 
      FROM users WHERE id = ?
    `;
    
    const user = await db.get(userQuery, [id]) as any;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      password_hash: user.password_hash,
      role: user.role || 'user',
      tenant_id: user.tenant_id?.toString(),
      tenant_role: user.tenant_role || 'user',
      global_role: user.role || 'user',
      organization_role: user.tenant_role || 'user',
      tenant_name: user.tenant_name,
      tenant_slug: user.tenant_slug,
      favorite_team_id: user.favorite_team_id,
      favorite_player_id: user.favorite_player_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  } catch (error) {
    console.error("Get user error:", error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}