import { DatabaseInterface, DatabaseFactory } from './database';
import { Player, Team, Manufacturer, TenantContext } from '../types';

export class ReferenceDataService {
  private db: DatabaseInterface;
  private isMultiTenant: boolean;
  private tenantContext?: TenantContext;

  constructor(tenantContext?: TenantContext) {
    this.isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    this.tenantContext = tenantContext;
    this.db = DatabaseFactory.getInstance({
      enableMultiTenant: this.isMultiTenant,
      tenantContext
    });
  }

  // Player operations
  async getAllPlayers(): Promise<Player[]> {
    const sql = 'SELECT * FROM players ORDER BY lastname, firstname';
    return this.db.all(sql);
  }

  async getPlayerById(id: string | number): Promise<Player | null> {
    const sql = 'SELECT * FROM players WHERE id = $1';
    return this.db.get(sql, [id]);
  }

  async createPlayer(player: Omit<Player, 'id'>): Promise<string | number> {
    const playerData = {
      ...player,
      tenant_id: this.tenantContext?.tenantId
    };

    if (process.env.DATABASE_TYPE === 'postgresql') {
      const sql = `
        INSERT INTO players (firstname, lastname, dob, tenant_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        playerData.firstname, 
        playerData.lastname, 
        playerData.dob,
        playerData.tenant_id
      ]);
      return result.id;
    } else {
      const sql = `
        INSERT INTO players (firstname, lastname, dob) 
        VALUES ($1, $2, $3)
      `;
      const result = await this.db.query(sql, [
        playerData.firstname, 
        playerData.lastname, 
        playerData.dob
      ]);
      return (result as any).lastID;
    }
  }

  async updatePlayer(id: string | number, player: Partial<Player>): Promise<boolean> {
    const sql = 'UPDATE players SET firstname = $1, lastname = $2, dob = $3 WHERE id = $4';
    const result = await this.db.query(sql, [
      player.firstname, 
      player.lastname, 
      player.dob, 
      id
    ]);
    return process.env.DATABASE_TYPE === 'postgresql' ? result.rowCount > 0 : result.changes > 0;
  }

  async deletePlayer(id: string | number): Promise<boolean> {
    const sql = 'DELETE FROM players WHERE id = $1';
    const result = await this.db.query(sql, [id]);
    return process.env.DATABASE_TYPE === 'postgresql' ? result.rowCount > 0 : result.changes > 0;
  }

  // Team operations
  async getAllTeams(): Promise<Team[]> {
    const sql = 'SELECT * FROM teams ORDER BY city, teamname';
    return this.db.all(sql);
  }

  async getTeamById(id: string | number): Promise<Team | null> {
    const sql = 'SELECT * FROM teams WHERE id = $1';
    return this.db.get(sql, [id]);
  }

  async createTeam(team: Omit<Team, 'id'>): Promise<string | number> {
    const teamData = {
      ...team,
      tenant_id: this.tenantContext?.tenantId
    };

    if (process.env.DATABASE_TYPE === 'postgresql') {
      const sql = `
        INSERT INTO teams (city, mascot, teamname, primary_color, secondary_color, accent_color, tenant_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        teamData.city,
        teamData.mascot,
        teamData.teamname,
        teamData.primary_color,
        teamData.secondary_color,
        teamData.accent_color,
        teamData.tenant_id
      ]);
      return result.id;
    } else {
      const sql = `
        INSERT INTO teams (city, mascot, teamname, primary_color, secondary_color, accent_color) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      const result = await this.db.query(sql, [
        teamData.city,
        teamData.mascot,
        teamData.teamname,
        teamData.primary_color,
        teamData.secondary_color,
        teamData.accent_color
      ]);
      return result.lastID;
    }
  }

  async updateTeam(id: string | number, team: Partial<Team>): Promise<boolean> {
    const sql = `
      UPDATE teams 
      SET city = $1, mascot = $2, teamname = $3, primary_color = $4, secondary_color = $5, accent_color = $6 
      WHERE id = $7
    `;
    const result = await this.db.query(sql, [
      team.city,
      team.mascot,
      team.teamname,
      team.primary_color,
      team.secondary_color,
      team.accent_color,
      id
    ]);
    return process.env.DATABASE_TYPE === 'postgresql' ? result.rowCount > 0 : result.changes > 0;
  }

  async deleteTeam(id: string | number): Promise<boolean> {
    const sql = 'DELETE FROM teams WHERE id = $1';
    const result = await this.db.query(sql, [id]);
    return process.env.DATABASE_TYPE === 'postgresql' ? result.rowCount > 0 : result.changes > 0;
  }

  // Manufacturer operations
  async getAllManufacturers(): Promise<Manufacturer[]> {
    const sql = 'SELECT * FROM manufacturers ORDER BY company, year';
    return this.db.all(sql);
  }

  async getManufacturerById(id: string | number): Promise<Manufacturer | null> {
    const sql = 'SELECT * FROM manufacturers WHERE id = $1';
    return this.db.get(sql, [id]);
  }

  async createManufacturer(manufacturer: Omit<Manufacturer, 'id'>): Promise<string | number> {
    const manufacturerData = {
      ...manufacturer,
      tenant_id: this.tenantContext?.tenantId
    };

    if (process.env.DATABASE_TYPE === 'postgresql') {
      const sql = `
        INSERT INTO manufacturers (company, year, subsetname, tenant_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        manufacturerData.company,
        manufacturerData.year,
        manufacturerData.subsetname,
        manufacturerData.tenant_id
      ]);
      return result.id;
    } else {
      const sql = `
        INSERT INTO manufacturers (company, year, subsetname) 
        VALUES ($1, $2, $3)
      `;
      const result = await this.db.query(sql, [
        manufacturerData.company,
        manufacturerData.year,
        manufacturerData.subsetname
      ]);
      return result.lastID;
    }
  }

  async updateManufacturer(id: string | number, manufacturer: Partial<Manufacturer>): Promise<boolean> {
    const sql = 'UPDATE manufacturers SET company = $1, year = $2, subsetname = $3 WHERE id = $4';
    const result = await this.db.query(sql, [
      manufacturer.company,
      manufacturer.year,
      manufacturer.subsetname,
      id
    ]);
    return process.env.DATABASE_TYPE === 'postgresql' ? result.rowCount > 0 : result.changes > 0;
  }

  async deleteManufacturer(id: string | number): Promise<boolean> {
    const sql = 'DELETE FROM manufacturers WHERE id = $1';
    const result = await this.db.query(sql, [id]);
    return process.env.DATABASE_TYPE === 'postgresql' ? result.rowCount > 0 : result.changes > 0;
  }

  // Cleanup
  async close(): Promise<void> {
    return this.db.close();
  }
}