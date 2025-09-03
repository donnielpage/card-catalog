import DatabaseService from './database';
import { 
  Card, 
  CardWithDetails, 
  CreateCardRequest, 
  UpdateCardRequest, 
  CardStats, 
  TenantContext 
} from '../types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class CardService {
  private database: DatabaseService;
  private referenceServiceUrl: string;

  constructor(database: DatabaseService, referenceServiceUrl: string) {
    this.database = database;
    this.referenceServiceUrl = referenceServiceUrl;
  }

  async getAllCards(tenantContext: TenantContext): Promise<CardWithDetails[]> {
    this.database.setTenantContext(tenantContext);
    
    const query = this.database.getDatabaseType() === 'postgres' ? `
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = $1
      ORDER BY c.created_at DESC
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
    `;

    return await this.database.query(query, [tenantContext.tenantId]);
  }

  async getCardById(id: string, tenantContext: TenantContext): Promise<CardWithDetails | null> {
    this.database.setTenantContext(tenantContext);
    
    const query = this.database.getDatabaseType() === 'postgres' ? `
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.id = ? AND c.tenant_id = ?
    `;

    return await this.database.queryOne(query, [id, tenantContext.tenantId]);
  }

  async createCard(cardData: CreateCardRequest, tenantContext: TenantContext): Promise<Card> {
    this.database.setTenantContext(tenantContext);

    // Validate references against Reference Service
    await this.validateReferences(cardData, tenantContext);

    const id = this.database.getDatabaseType() === 'postgres' ? undefined : uuidv4();
    const query = this.database.getDatabaseType() === 'postgres' ? `
      INSERT INTO cards (cardnumber, year, description, grade, playerid, teamid, manufacturerid, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    ` : `
      INSERT INTO cards (id, cardnumber, year, description, grade, playerid, teamid, manufacturerid, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = this.database.getDatabaseType() === 'postgres' 
      ? [cardData.cardnumber, cardData.year, cardData.description, cardData.grade, 
         cardData.playerid, cardData.teamid, cardData.manufacturerid, tenantContext.tenantId]
      : [id, cardData.cardnumber, cardData.year, cardData.description, cardData.grade, 
         cardData.playerid, cardData.teamid, cardData.manufacturerid, tenantContext.tenantId];

    if (this.database.getDatabaseType() === 'postgres') {
      const result = await this.database.query(query, params);
      return result[0];
    } else {
      await this.database.execute(query, params);
      return await this.getCardById(id!, tenantContext) as Card;
    }
  }

  async updateCard(id: string, cardData: UpdateCardRequest, tenantContext: TenantContext): Promise<Card | null> {
    this.database.setTenantContext(tenantContext);

    // Validate references against Reference Service
    await this.validateReferences(cardData, tenantContext);

    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (cardData.cardnumber !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `cardnumber = $${paramIndex}` : 'cardnumber = ?');
      params.push(cardData.cardnumber);
      paramIndex++;
    }
    if (cardData.year !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `year = $${paramIndex}` : 'year = ?');
      params.push(cardData.year);
      paramIndex++;
    }
    if (cardData.description !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `description = $${paramIndex}` : 'description = ?');
      params.push(cardData.description);
      paramIndex++;
    }
    if (cardData.grade !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `grade = $${paramIndex}` : 'grade = ?');
      params.push(cardData.grade);
      paramIndex++;
    }
    if (cardData.playerid !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `playerid = $${paramIndex}` : 'playerid = ?');
      params.push(cardData.playerid);
      paramIndex++;
    }
    if (cardData.teamid !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `teamid = $${paramIndex}` : 'teamid = ?');
      params.push(cardData.teamid);
      paramIndex++;
    }
    if (cardData.manufacturerid !== undefined) {
      updateFields.push(this.database.getDatabaseType() === 'postgres' ? `manufacturerid = $${paramIndex}` : 'manufacturerid = ?');
      params.push(cardData.manufacturerid);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getCardById(id, tenantContext) as Card;
    }

    updateFields.push(this.database.getDatabaseType() === 'postgres' ? `updated_at = $${paramIndex}` : 'updated_at = ?');
    params.push(new Date());
    paramIndex++;

    const query = this.database.getDatabaseType() === 'postgres' ? `
      UPDATE cards 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    ` : `
      UPDATE cards 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `;

    params.push(id, tenantContext.tenantId);

    if (this.database.getDatabaseType() === 'postgres') {
      const result = await this.database.query(query, params);
      return result.length > 0 ? result[0] : null;
    } else {
      await this.database.execute(query, params);
      return await this.getCardById(id, tenantContext) as Card;
    }
  }

  async deleteCard(id: string, tenantContext: TenantContext): Promise<boolean> {
    this.database.setTenantContext(tenantContext);
    
    const query = this.database.getDatabaseType() === 'postgres' 
      ? 'DELETE FROM cards WHERE id = $1 AND tenant_id = $2'
      : 'DELETE FROM cards WHERE id = ? AND tenant_id = ?';
    
    await this.database.execute(query, [id, tenantContext.tenantId]);
    
    // Check if the card was actually deleted
    const checkQuery = this.database.getDatabaseType() === 'postgres'
      ? 'SELECT COUNT(*) as count FROM cards WHERE id = $1 AND tenant_id = $2'
      : 'SELECT COUNT(*) as count FROM cards WHERE id = ? AND tenant_id = ?';
    
    const result = await this.database.queryOne(checkQuery, [id, tenantContext.tenantId]);
    return result?.count === 0;
  }

  async getCardStats(tenantContext: TenantContext): Promise<CardStats> {
    this.database.setTenantContext(tenantContext);

    // Total cards
    const totalQuery = this.database.getDatabaseType() === 'postgres'
      ? 'SELECT COUNT(*) as total_cards FROM cards WHERE tenant_id = $1'
      : 'SELECT COUNT(*) as total_cards FROM cards WHERE tenant_id = ?';
    const totalResult = await this.database.queryOne(totalQuery, [tenantContext.tenantId]);

    // Cards by year
    const yearQuery = this.database.getDatabaseType() === 'postgres' ? `
      SELECT year, COUNT(*) as count 
      FROM cards 
      WHERE tenant_id = $1 
      GROUP BY year 
      ORDER BY year DESC
    ` : `
      SELECT year, COUNT(*) as count 
      FROM cards 
      WHERE tenant_id = ? 
      GROUP BY year 
      ORDER BY year DESC
    `;
    const yearResults = await this.database.query(yearQuery, [tenantContext.tenantId]);
    const cards_by_year = yearResults.reduce((acc: any, row: any) => {
      acc[row.year.toString()] = parseInt(row.count);
      return acc;
    }, {});

    // Cards by grade
    const gradeQuery = this.database.getDatabaseType() === 'postgres' ? `
      SELECT grade, COUNT(*) as count 
      FROM cards 
      WHERE tenant_id = $1 AND grade IS NOT NULL 
      GROUP BY grade 
      ORDER BY count DESC
    ` : `
      SELECT grade, COUNT(*) as count 
      FROM cards 
      WHERE tenant_id = ? AND grade IS NOT NULL 
      GROUP BY grade 
      ORDER BY count DESC
    `;
    const gradeResults = await this.database.query(gradeQuery, [tenantContext.tenantId]);
    const cards_by_grade = gradeResults.reduce((acc: any, row: any) => {
      acc[row.grade] = parseInt(row.count);
      return acc;
    }, {});

    // Top manufacturers
    const manufacturerQuery = this.database.getDatabaseType() === 'postgres' ? `
      SELECT m.company as name, COUNT(*) as count
      FROM cards c
      JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = $1
      GROUP BY m.company
      ORDER BY count DESC
      LIMIT 10
    ` : `
      SELECT m.company as name, COUNT(*) as count
      FROM cards c
      JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = ?
      GROUP BY m.company
      ORDER BY count DESC
      LIMIT 10
    `;
    const manufacturerResults = await this.database.query(manufacturerQuery, [tenantContext.tenantId]);
    const top_manufacturers = manufacturerResults.map((row: any) => ({
      name: row.name,
      count: parseInt(row.count)
    }));

    // Top players
    const playerQuery = this.database.getDatabaseType() === 'postgres' ? `
      SELECT (p.firstname || ' ' || p.lastname) as name, COUNT(*) as count
      FROM cards c
      JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      WHERE c.tenant_id = $1
      GROUP BY p.firstname, p.lastname
      ORDER BY count DESC
      LIMIT 10
    ` : `
      SELECT (p.firstname || ' ' || p.lastname) as name, COUNT(*) as count
      FROM cards c
      JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      WHERE c.tenant_id = ?
      GROUP BY p.firstname, p.lastname
      ORDER BY count DESC
      LIMIT 10
    `;
    const playerResults = await this.database.query(playerQuery, [tenantContext.tenantId]);
    const top_players = playerResults.map((row: any) => ({
      name: row.name,
      count: parseInt(row.count)
    }));

    // Recent additions
    const recentQuery = this.database.getDatabaseType() === 'postgres' ? `
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = $1
      ORDER BY c.created_at DESC
      LIMIT 5
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `;
    const recent_additions = await this.database.query(recentQuery, [tenantContext.tenantId]);

    return {
      total_cards: parseInt(totalResult?.total_cards || 0),
      cards_by_year,
      cards_by_grade,
      top_manufacturers,
      top_players,
      recent_additions
    };
  }

  private async validateReferences(cardData: CreateCardRequest | UpdateCardRequest, tenantContext: TenantContext): Promise<void> {
    const headers = {
      'Authorization': `Bearer ${process.env.SERVICE_JWT_TOKEN}`,
      'X-Tenant-Id': tenantContext.tenantId,
      'X-Tenant-Slug': tenantContext.tenantSlug,
      'X-Tenant-Name': tenantContext.tenantName
    };

    try {
      // Validate player if provided
      if (cardData.playerid) {
        await axios.get(`${this.referenceServiceUrl}/players/${cardData.playerid}`, { headers });
      }

      // Validate team if provided
      if (cardData.teamid) {
        await axios.get(`${this.referenceServiceUrl}/teams/${cardData.teamid}`, { headers });
      }

      // Validate manufacturer if provided
      if (cardData.manufacturerid) {
        await axios.get(`${this.referenceServiceUrl}/manufacturers/${cardData.manufacturerid}`, { headers });
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error('Invalid reference ID provided');
      }
      throw error;
    }
  }

  async searchCards(query: string, tenantContext: TenantContext): Promise<CardWithDetails[]> {
    this.database.setTenantContext(tenantContext);
    
    const searchQuery = this.database.getDatabaseType() === 'postgres' ? `
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = $1 AND (
        c.cardnumber ILIKE $2 OR
        c.description ILIKE $2 OR
        c.grade ILIKE $2 OR
        p.firstname ILIKE $2 OR
        p.lastname ILIKE $2 OR
        t.city ILIKE $2 OR
        t.mascot ILIKE $2 OR
        m.company ILIKE $2
      )
      ORDER BY c.created_at DESC
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
      LEFT JOIN players p ON c.playerid = p.id AND c.tenant_id = p.tenant_id
      LEFT JOIN teams t ON c.teamid = t.id AND c.tenant_id = t.tenant_id
      LEFT JOIN manufacturers m ON c.manufacturerid = m.id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = ? AND (
        c.cardnumber LIKE ? OR
        c.description LIKE ? OR
        c.grade LIKE ? OR
        p.firstname LIKE ? OR
        p.lastname LIKE ? OR
        t.city LIKE ? OR
        t.mascot LIKE ? OR
        m.company LIKE ?
      )
      ORDER BY c.created_at DESC
    `;

    const searchTerm = `%${query}%`;
    const params = this.database.getDatabaseType() === 'postgres' 
      ? [tenantContext.tenantId, searchTerm]
      : [tenantContext.tenantId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

    return await this.database.query(searchQuery, params);
  }
}

export default CardService;