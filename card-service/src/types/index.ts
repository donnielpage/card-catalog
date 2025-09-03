import { Request } from 'express';

export interface Card {
  id: string;
  cardnumber: string;
  year: number;
  description?: string;
  grade?: string;
  playerid?: string;
  teamid?: string;
  manufacturerid?: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
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

export interface CreateCardRequest {
  cardnumber: string;
  year: number;
  description?: string;
  grade?: string;
  playerid?: string;
  teamid?: string;
  manufacturerid?: string;
}

export interface UpdateCardRequest {
  cardnumber?: string;
  year?: number;
  description?: string;
  grade?: string;
  playerid?: string;
  teamid?: string;
  manufacturerid?: string;
}

export interface Player {
  id: string;
  firstname: string;
  lastname: string;
  tenant_id: string;
}

export interface Team {
  id: string;
  city: string;
  mascot: string;
  tenant_id: string;
}

export interface Manufacturer {
  id: string;
  company: string;
  year: number;
  subsetname?: string;
  tenant_id: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  tenantId: string;
  globalRole?: 'global_admin' | 'tenant_admin' | 'user';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  tenantContext?: TenantContext;
}

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

export interface DatabaseConfig {
  type: 'postgres' | 'sqlite';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
}

export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  corsOrigin: string;
  database: DatabaseConfig;
  services: {
    referenceService: string;
    userService: string;
    tenantService: string;
    mediaService: string;
  };
}

export interface CardStats {
  total_cards: number;
  cards_by_year: { [year: string]: number };
  cards_by_grade: { [grade: string]: number };
  top_manufacturers: { name: string; count: number }[];
  top_players: { name: string; count: number }[];
  recent_additions: CardWithDetails[];
}