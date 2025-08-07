import Database from './database';
import { Card, Player, Team, Manufacturer, CardWithDetails } from './types';

export class CardService {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  // Cards CRUD
  async getAllCards(): Promise<CardWithDetails[]> {
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

  async getCardById(id: number): Promise<CardWithDetails | null> {
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
      WHERE c.id = ?
    `;
    return await this.db.get(sql, [id]) as CardWithDetails | null;
  }

  async createCard(card: Omit<Card, 'id'>): Promise<number> {
    const sql = `
      INSERT INTO cards (cardnumber, playerid, teamid, manufacturerid, year, imageurl, condition, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    return result.id;
  }

  async updateCard(id: number, card: Partial<Card>): Promise<void> {
    const sql = `
      UPDATE cards 
      SET cardnumber = ?, playerid = ?, teamid = ?, manufacturerid = ?, year = ?, imageurl = ?, condition = ?, notes = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      card.cardnumber,
      card.playerid || null,
      card.teamid || null,
      card.manufacturerid || null,
      card.year || null,
      card.imageurl || null,
      card.condition || null,
      card.notes || null,
      id
    ]);
  }

  async deleteCard(id: number): Promise<void> {
    await this.db.run('DELETE FROM cards WHERE id = ?', [id]);
  }

  // Players CRUD
  async getAllPlayers(): Promise<Player[]> {
    return await this.db.all('SELECT * FROM players ORDER BY lastname, firstname') as Player[];
  }

  async createPlayer(player: Omit<Player, 'id'>): Promise<number> {
    const sql = 'INSERT INTO players (firstname, lastname, dob) VALUES (?, ?, ?)';
    const result = await this.db.run(sql, [player.firstname, player.lastname, player.dob || null]);
    return result.id;
  }

  async deletePlayer(id: number): Promise<void> {
    await this.db.run('DELETE FROM players WHERE id = ?', [id]);
  }

  // Teams CRUD
  async getAllTeams(): Promise<Team[]> {
    return await this.db.all('SELECT * FROM teams ORDER BY city') as Team[];
  }

  async getTeamById(id: number): Promise<Team | null> {
    return await this.db.get('SELECT * FROM teams WHERE id = ?', [id]) as Team | null;
  }

  async createTeam(team: Omit<Team, 'id'>): Promise<number> {
    const sql = 'INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES (?, ?, ?, ?, ?)';
    const result = await this.db.run(sql, [
      team.city, 
      team.mascot || null, 
      team.primary_color || null,
      team.secondary_color || null,
      team.accent_color || null
    ]);
    return result.id;
  }

  async deleteTeam(id: number): Promise<void> {
    await this.db.run('DELETE FROM teams WHERE id = ?', [id]);
  }

  // Manufacturers CRUD
  async getAllManufacturers(): Promise<Manufacturer[]> {
    return await this.db.all('SELECT * FROM manufacturers ORDER BY company, year') as Manufacturer[];
  }

  async createManufacturer(manufacturer: Omit<Manufacturer, 'id'>): Promise<number> {
    const sql = 'INSERT INTO manufacturers (company, year, subsetname) VALUES (?, ?, ?)';
    const result = await this.db.run(sql, [
      manufacturer.company,
      manufacturer.year || null,
      manufacturer.subsetname || null
    ]);
    return result.id;
  }

  async deleteManufacturer(id: number): Promise<void> {
    await this.db.run('DELETE FROM manufacturers WHERE id = ?', [id]);
  }

  close(): void {
    this.db.close();
  }
}