import { DatabaseFactory } from './database-factory';
import { DatabaseInterface } from './database-interface';
import { TenantContext } from './database-pg';
import { Card, Player, Team, Manufacturer, CardWithDetails } from './types';

export class TenantAwareCardService {
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

  private getTenantId(): string {
    if (!this.isMultiTenant || !this.tenantContext) {
      console.error('getTenantId error - missing context:', { 
        isMultiTenant: this.isMultiTenant, 
        tenantContext: this.tenantContext 
      });
      throw new Error('Tenant context required for multi-tenant operations');
    }
    console.log('getTenantId returning:', this.tenantContext.tenantId);
    return this.tenantContext.tenantId;
  }

  async getAllCards(): Promise<CardWithDetails[]> {
    if (this.isMultiTenant) {
      // PostgreSQL mode with RLS handling tenant isolation automatically
      const sql = `
        SELECT 
          c.*,
          p.firstname as player_firstname,
          p.lastname as player_lastname,
          t.city as team_city,
          t.mascot as team_mascot,
          m.company as manufacturer_company,
          m.year as manufacturer_year,
          m.subsetname as manufacturer_subsetname
        FROM cards c
        LEFT JOIN players p ON c.playerid = p.id
        LEFT JOIN teams t ON c.teamid = t.id
        LEFT JOIN manufacturers m ON c.manufacturerid = m.id
        ORDER BY c.year DESC, c.cardnumber
      `;
      
      // RLS automatically filters by tenant_id using session variable
      return await this.db.all(sql) as CardWithDetails[];
    } else {
      // SQLite mode - no tenant filtering needed
      const sql = `
        SELECT 
          c.*,
          p.firstname as player_firstname,
          p.lastname as player_lastname,
          t.city as team_city,
          t.mascot as team_mascot,
          m.company as manufacturer_company,
          m.year as manufacturer_year,
          m.subsetname as manufacturer_subsetname
        FROM cards c
        LEFT JOIN players p ON c.playerid = p.id
        LEFT JOIN teams t ON c.teamid = t.id
        LEFT JOIN manufacturers m ON c.manufacturerid = m.id
        ORDER BY c.year DESC, c.cardnumber
      `;
      return await this.db.all(sql) as CardWithDetails[];
    }
  }

  async getCardById(id: string | number): Promise<CardWithDetails | null> {
    const sql = this.isMultiTenant ? `
      SELECT 
        c.*,
        p.firstname as player_firstname,
        p.lastname as player_lastname,
        t.city as team_city,
        t.mascot as team_mascot,
        m.company as manufacturer_company,
        m.year as manufacturer_year,
        m.subsetname as manufacturer_subsetname
      FROM cards c
      LEFT JOIN players p ON c.playerid = p.id AND p.tenant_id = c.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND t.tenant_id = c.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND m.tenant_id = c.tenant_id
      WHERE c.id = $1 AND c.tenant_id = $2
    ` : `
      SELECT 
        c.*,
        p.firstname as player_firstname,
        p.lastname as player_lastname,
        t.city as team_city,
        t.mascot as team_mascot,
        m.company as manufacturer_company,
        m.year as manufacturer_year,
        m.subsetname as manufacturer_subsetname
      FROM cards c
      LEFT JOIN players p ON c.playerid = p.id
      LEFT JOIN teams t ON c.teamid = t.id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id
      WHERE c.id = ?
    `;

    if (this.isMultiTenant) {
      // PostgreSQL mode with tenant context
      return await this.db.get(sql, [id]) as CardWithDetails | null;
    } else {
      // SQLite mode
      return await this.db.get(sql, [id]) as CardWithDetails | null;
    }
  }

  async createCard(card: Omit<Card, 'id'>): Promise<string | number> {
    if (this.isMultiTenant) {
      // PostgreSQL mode - UUID and tenant_id are handled by adapter
      const sql = `
        INSERT INTO cards (tenant_id, cardnumber, playerid, teamid, manufacturerid, year, imageurl, condition, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        this.getTenantId(),
        card.cardnumber,
        card.playerid || null,
        card.teamid || null,
        card.manufacturerid || null,
        card.year || null,
        card.imageurl || null,
        card.condition || null,
        card.notes || null
      ]) as { id: string };
      return result.id;
    } else {
      // SQLite mode - auto-increment integer IDs
      const sql = `
        INSERT INTO cards (cardnumber, playerid, teamid, manufacturerid, year, imageurl, condition, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      const result = await this.db.run(sql, [
        card.cardnumber,
        card.playerid || null,
        card.teamid || null,
        card.manufacturerid || null,
        card.year || null,
        card.imageurl || null,
        card.condition || null,
        card.notes || null
      ]);
      return result.lastInsertRowid!;
    }
  }

  async updateCard(id: string | number, card: Partial<Card>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (card.cardnumber !== undefined) {
      updates.push(`cardnumber = $${paramIndex++}`);
      values.push(card.cardnumber);
    }
    if (card.playerid !== undefined) {
      updates.push(`playerid = $${paramIndex++}`);
      values.push(card.playerid);
    }
    if (card.teamid !== undefined) {
      updates.push(`teamid = $${paramIndex++}`);
      values.push(card.teamid);
    }
    if (card.manufacturerid !== undefined) {
      updates.push(`manufacturerid = $${paramIndex++}`);
      values.push(card.manufacturerid);
    }
    if (card.year !== undefined) {
      updates.push(`year = $${paramIndex++}`);
      values.push(card.year);
    }
    if (card.imageurl !== undefined) {
      updates.push(`imageurl = $${paramIndex++}`);
      values.push(card.imageurl);
    }
    if (card.condition !== undefined) {
      updates.push(`condition = $${paramIndex++}`);
      values.push(card.condition);
    }
    if (card.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(card.notes);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(this.isMultiTenant ? 'NOW()' : "datetime('now')");
    
    const sql = this.isMultiTenant 
      ? `UPDATE cards SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`
      : `UPDATE cards SET ${updates.join(', ')} WHERE id = ?`;

    values.push(id);
    
    if (this.isMultiTenant) {
      // Tenant context is handled by the database adapter
    }

    const result = await this.db.run(sql, values);
    return (result.changes ?? 0) > 0;
  }

  async deleteCard(id: string | number): Promise<boolean> {
    const sql = this.isMultiTenant 
      ? 'DELETE FROM cards WHERE id = $1 AND tenant_id = $2'
      : 'DELETE FROM cards WHERE id = ?';
    
    const result = await this.db.run(sql, [id]);
    return (result.changes ?? 0) > 0;
  }

  // Teams CRUD
  async getAllTeams(): Promise<Team[]> {
    if (this.isMultiTenant) {
      // Manual tenant filtering since RLS is disabled
      const sql = 'SELECT * FROM teams WHERE tenant_id = $1 ORDER BY city, mascot';
      const teams = await this.db.all(sql, [this.getTenantId()]) as Team[];
      console.log('getAllTeams - PostgreSQL with tenant filter:', teams.map(t => ({ id: t.id, name: `${t.city} ${t.mascot}`, tenant_id: (t as any).tenant_id })));
      return teams;
    } else {
      // SQLite mode - no tenant filtering needed
      const sql = 'SELECT * FROM teams ORDER BY city, mascot';
      const teams = await this.db.all(sql) as Team[];
      console.log('getAllTeams - SQLite results:', teams.map(t => ({ id: t.id, name: `${t.city} ${t.mascot}` })));
      return teams;
    }
  }

  async createTeam(team: Omit<Team, 'id'>): Promise<string | number> {
    if (this.isMultiTenant) {
      const sql = `
        INSERT INTO teams (tenant_id, city, mascot, teamname, primary_color, secondary_color, accent_color, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        this.getTenantId(), 
        team.city, 
        team.mascot, 
        team.teamname,
        team.primary_color || null,
        team.secondary_color || null,
        team.accent_color || null
      ]) as { id: string };
      return result.id;
    } else {
      const sql = `
        INSERT INTO teams (city, mascot, teamname, primary_color, secondary_color, accent_color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      const result = await this.db.run(sql, [
        team.city, 
        team.mascot, 
        team.teamname,
        team.primary_color || null,
        team.secondary_color || null,
        team.accent_color || null
      ]);
      return result.lastInsertRowid!;
    }
  }

  // Players CRUD
  async getAllPlayers(): Promise<Player[]> {
    if (this.isMultiTenant) {
      // Manual tenant filtering since RLS is disabled
      const sql = 'SELECT * FROM players WHERE tenant_id = $1 ORDER BY lastname, firstname';
      const players = await this.db.all(sql, [this.getTenantId()]) as Player[];
      console.log('getAllPlayers - PostgreSQL with tenant filter:', players.map(p => ({ id: p.id, name: `${p.firstname} ${p.lastname}`, tenant_id: (p as any).tenant_id })));
      return players;
    } else {
      // SQLite mode - no tenant filtering needed
      const sql = 'SELECT * FROM players ORDER BY lastname, firstname';
      const players = await this.db.all(sql) as Player[];
      console.log('getAllPlayers - SQLite results:', players.map(p => ({ id: p.id, name: `${p.firstname} ${p.lastname}` })));
      return players;
    }
  }

  async createPlayer(player: Omit<Player, 'id'>): Promise<string | number> {
    if (this.isMultiTenant) {
      const sql = `
        INSERT INTO players (tenant_id, firstname, lastname, dob, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        this.getTenantId(),
        player.firstname, 
        player.lastname, 
        player.dob || null
      ]) as { id: string };
      return result.id;
    } else {
      const sql = `
        INSERT INTO players (firstname, lastname, dob, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `;
      const result = await this.db.run(sql, [
        player.firstname, 
        player.lastname, 
        player.dob || null
      ]);
      return result.lastInsertRowid!;
    }
  }

  async updateTeam(id: string | number, team: Partial<Team>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (team.city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(team.city);
    }
    if (team.mascot !== undefined) {
      updates.push(`mascot = $${paramIndex++}`);
      values.push(team.mascot);
    }
    if (team.teamname !== undefined) {
      updates.push(`teamname = $${paramIndex++}`);
      values.push(team.teamname);
    }
    if (team.primary_color !== undefined) {
      updates.push(`primary_color = $${paramIndex++}`);
      values.push(team.primary_color);
    }
    if (team.secondary_color !== undefined) {
      updates.push(`secondary_color = $${paramIndex++}`);
      values.push(team.secondary_color);
    }
    if (team.accent_color !== undefined) {
      updates.push(`accent_color = $${paramIndex++}`);
      values.push(team.accent_color);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(this.isMultiTenant ? 'NOW()' : "datetime('now')");
    
    const sql = this.isMultiTenant 
      ? `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`
      : `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`;

    values.push(id);
    
    if (this.isMultiTenant) {
      values.push(this.getTenantId());
    }

    const result = await this.db.run(sql, values);
    return (result.changes ?? 0) > 0;
  }

  // Manufacturers CRUD
  async getAllManufacturers(): Promise<Manufacturer[]> {
    if (this.isMultiTenant) {
      // Manual tenant filtering since RLS is disabled
      const sql = 'SELECT * FROM manufacturers WHERE tenant_id = $1 ORDER BY company, year, subsetname';
      const manufacturers = await this.db.all(sql, [this.getTenantId()]) as Manufacturer[];
      console.log('getAllManufacturers - PostgreSQL with tenant filter:', manufacturers.map(m => ({ id: m.id, name: `${m.company} ${m.year || ''} ${m.subsetname || ''}`.trim(), tenant_id: (m as any).tenant_id })));
      return manufacturers;
    } else {
      // SQLite mode - no tenant filtering needed
      const sql = 'SELECT * FROM manufacturers ORDER BY company, year, subsetname';
      const manufacturers = await this.db.all(sql) as Manufacturer[];
      console.log('getAllManufacturers - SQLite results:', manufacturers.map(m => ({ id: m.id, name: `${m.company} ${m.year || ''} ${m.subsetname || ''}`.trim() })));
      return manufacturers;
    }
  }

  async createManufacturer(manufacturer: Omit<Manufacturer, 'id'>): Promise<string | number> {
    if (this.isMultiTenant) {
      const sql = `
        INSERT INTO manufacturers (tenant_id, company, year, subsetname, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `;
      const result = await this.db.get(sql, [
        this.getTenantId(),
        manufacturer.company,
        manufacturer.year || null,
        manufacturer.subsetname || null
      ]) as { id: string };
      return result.id;
    } else {
      const sql = `
        INSERT INTO manufacturers (company, year, subsetname, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `;
      const result = await this.db.run(sql, [
        manufacturer.company,
        manufacturer.year || null,
        manufacturer.subsetname || null
      ]);
      return result.lastInsertRowid!;
    }
  }

  async updateManufacturer(id: string | number, manufacturer: Partial<Manufacturer>): Promise<boolean> {
    if (this.isMultiTenant) {
      // PostgreSQL mode
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (manufacturer.company !== undefined) {
        updates.push(`company = $${paramIndex++}`);
        values.push(manufacturer.company);
      }
      if (manufacturer.year !== undefined) {
        updates.push(`year = $${paramIndex++}`);
        values.push(manufacturer.year);
      }
      if (manufacturer.subsetname !== undefined) {
        updates.push(`subsetname = $${paramIndex++}`);
        values.push(manufacturer.subsetname);
      }
      
      if (updates.length === 0) {
        return false;
      }
      
      updates.push(`updated_at = NOW()`);
      
      const sql = `UPDATE manufacturers SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`;
      values.push(id);
      values.push(this.getTenantId());
      
      const result = await this.db.run(sql, values);
      return (result.changes ?? 0) > 0;
    } else {
      // SQLite mode
      const updates: string[] = [];
      const values: any[] = [];
      
      if (manufacturer.company !== undefined) {
        updates.push(`company = ?`);
        values.push(manufacturer.company);
      }
      if (manufacturer.year !== undefined) {
        updates.push(`year = ?`);
        values.push(manufacturer.year);
      }
      if (manufacturer.subsetname !== undefined) {
        updates.push(`subsetname = ?`);
        values.push(manufacturer.subsetname);
      }
      
      if (updates.length === 0) {
        return false;
      }
      
      updates.push(`updated_at = datetime('now')`);
      
      const sql = `UPDATE manufacturers SET ${updates.join(', ')} WHERE id = ?`;
      values.push(id);
      
      const result = await this.db.run(sql, values);
      return (result.changes ?? 0) > 0;
    }
  }

  async updatePlayer(id: string | number, player: Partial<Player>): Promise<boolean> {
    if (this.isMultiTenant) {
      // PostgreSQL mode
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (player.firstname !== undefined) {
        updates.push(`firstname = $${paramIndex++}`);
        values.push(player.firstname);
      }
      if (player.lastname !== undefined) {
        updates.push(`lastname = $${paramIndex++}`);
        values.push(player.lastname);
      }
      if (player.dob !== undefined) {
        updates.push(`dob = $${paramIndex++}`);
        values.push(player.dob);
      }
      
      if (updates.length === 0) {
        return false;
      }
      
      updates.push(`updated_at = NOW()`);
      
      const sql = `UPDATE players SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`;
      values.push(id);
      const tenantId = this.getTenantId();
      values.push(tenantId);
      
      console.log('Executing player update SQL (PostgreSQL):', { sql, values, tenantId });
      const result = await this.db.run(sql, values);
      console.log('Player update result:', result);
      return (result.changes ?? 0) > 0;
    } else {
      // SQLite mode
      const updates: string[] = [];
      const values: any[] = [];
      
      if (player.firstname !== undefined) {
        updates.push(`firstname = ?`);
        values.push(player.firstname);
      }
      if (player.lastname !== undefined) {
        updates.push(`lastname = ?`);
        values.push(player.lastname);
      }
      if (player.dob !== undefined) {
        updates.push(`dob = ?`);
        values.push(player.dob);
      }
      
      if (updates.length === 0) {
        return false;
      }
      
      updates.push(`updated_at = datetime('now')`);
      
      const sql = `UPDATE players SET ${updates.join(', ')} WHERE id = ?`;
      values.push(id);
      
      console.log('Executing player update SQL (SQLite):', { sql, values });
      const result = await this.db.run(sql, values);
      console.log('Player update result:', result);
      return (result.changes ?? 0) > 0;
    }
  }

  close(): void {
    // DatabaseFactory manages all connections now (both SQLite and PostgreSQL)
    // No manual close needed as it handles connection pooling and lifecycle
    // This prevents "Database is closed" errors when switching between modes
  }
}