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

export interface User {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  password_hash: string;
  role: 'user' | 'manager' | 'admin';
  favorite_team_id?: number;
  favorite_player_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
}

export type UserRole = 'user' | 'manager' | 'admin';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  favorite_team_id?: number;
  favorite_player_id?: number;
}