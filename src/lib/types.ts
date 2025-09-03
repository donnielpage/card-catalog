export interface Card {
  id?: number;
  cardnumber: string;
  playerid?: number;
  teamid?: number;
  manufacturerid?: number;
  year?: number;
  imageurl?: string;
  condition?: string;
  notes?: string;
}

export interface Player {
  id?: number;
  firstname: string;
  lastname: string;
  dob?: string;
}

export interface Team {
  id?: number;
  city: string;
  mascot?: string;
  teamname: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export interface Manufacturer {
  id?: number;
  company: string;
  year?: number;
  subsetname?: string;
}

export interface CardWithDetails extends Card {
  player_firstname?: string;
  player_lastname?: string;
  team_city?: string;
  team_mascot?: string;
  manufacturer_company?: string;
  manufacturer_year?: number;
  manufacturer_subsetname?: string;
}

// Hierarchical Role Types
export type GlobalRole = 'global_admin' | 'global_operator' | 'user';
export type OrganizationRole = 'org_admin' | 'user';

export interface User {
  id: number | string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  password_hash: string;
  role: GlobalRole;
  tenant_id?: string;
  tenant_role?: OrganizationRole;
  favorite_team_id?: number | string;
  favorite_player_id?: number | string;
  created_at: string;
  updated_at: string;
}

export interface HierarchicalUser extends User {
  tenant_id: string;
  global_role: GlobalRole;
  organization_role: OrganizationRole;
  tenant_name?: string;
  tenant_slug?: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
}

// Legacy type for backwards compatibility
export type UserRole = 'user' | 'manager' | 'admin' | 'global_admin' | 'global_operator';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  global_role?: GlobalRole;
  organization_role?: OrganizationRole;
  tenant_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  favorite_team_id?: number | string;
  favorite_player_id?: number | string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_tier?: string;
  max_users?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}