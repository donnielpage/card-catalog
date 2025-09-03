import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import DatabaseService from './database';
import { User, CreateUserRequest, UpdateUserRequest, LoginRequest, LoginResponse, AuthTokenPayload } from '../types';

export class UserService {
  private db: DatabaseService;
  private jwtSecret: string;

  constructor(db: DatabaseService, jwtSecret: string) {
    this.db = db;
    this.jwtSecret = jwtSecret;
  }

  async createUser(userData: CreateUserRequest, tenantId: string): Promise<User> {
    const { email, password, name, role = 'user' } = userData;

    // Check if user already exists
    const existingUser = await this.db.queryOne(
      'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
      [email, tenantId]
    );

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate user ID
    const userId = uuidv4();

    // Insert user
    await this.db.execute(
      `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [userId, email, passwordHash, name, role, tenantId]
    );

    // Return user without password
    const user = await this.getUserById(userId, tenantId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async authenticateUser(credentials: LoginRequest, tenantId: string): Promise<LoginResponse> {
    const { email, password } = credentials;

    // Get user with password hash
    const userRow = await this.db.queryOne(
      'SELECT id, email, password_hash, name, role, tenant_id, is_active FROM users WHERE email = ? AND tenant_id = ?',
      [email, tenantId]
    );

    if (!userRow || !userRow.is_active) {
      throw new Error('Invalid credentials or inactive user');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const tokenPayload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role,
      tenantId: userRow.tenant_id
    };

    const token = jwt.sign(tokenPayload, this.jwtSecret, { 
      expiresIn: '24h',
      issuer: 'cardvault-user-service'
    });

    // Remove password hash from response
    const user: User = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      tenant_id: userRow.tenant_id,
      created_at: new Date(userRow.created_at),
      updated_at: new Date(userRow.updated_at),
      is_active: userRow.is_active
    };

    return {
      token,
      user,
      expires_in: 86400 // 24 hours in seconds
    };
  }

  async getUserById(userId: string, tenantId: string): Promise<User | null> {
    const userRow = await this.db.queryOne(
      'SELECT id, email, name, role, tenant_id, is_active, created_at, updated_at FROM users WHERE id = ? AND tenant_id = ?',
      [userId, tenantId]
    );

    if (!userRow) {
      return null;
    }

    return {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      tenant_id: userRow.tenant_id,
      created_at: new Date(userRow.created_at),
      updated_at: new Date(userRow.updated_at),
      is_active: userRow.is_active
    };
  }

  async getAllUsers(tenantId: string, limit = 50, offset = 0): Promise<User[]> {
    const userRows = await this.db.query(
      `SELECT id, email, name, role, tenant_id, is_active, created_at, updated_at 
       FROM users WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [tenantId, limit, offset]
    );

    return userRows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      tenant_id: row.tenant_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_active: row.is_active
    }));
  }

  async updateUser(userId: string, tenantId: string, updateData: UpdateUserRequest): Promise<User> {
    const { email, name, role, is_active } = updateData;
    
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];

    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (role !== undefined) {
      fields.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime("now")');
    values.push(userId, tenantId);

    await this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );

    const updatedUser = await this.getUserById(userId, tenantId);
    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async deleteUser(userId: string, tenantId: string): Promise<void> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM users WHERE id = ? AND tenant_id = ?',
      [userId, tenantId]
    );

    if (result[0]?.count === 0) {
      throw new Error('User not found');
    }

    await this.db.execute(
      'DELETE FROM users WHERE id = ? AND tenant_id = ?',
      [userId, tenantId]
    );
  }

  async updatePassword(userId: string, tenantId: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.db.execute(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ? AND tenant_id = ?',
      [passwordHash, userId, tenantId]
    );
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}