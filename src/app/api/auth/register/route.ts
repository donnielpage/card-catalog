import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  const db = new Database();
  try {
    const { username, email, firstname, lastname, password, role = 'user' } = await request.json();

    if (!username || !email || !firstname || !lastname || !password) {
      return NextResponse.json(
        { error: 'Username, email, firstname, lastname, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.run(
      'INSERT INTO users (username, email, firstname, lastname, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, firstname, lastname, passwordHash, role]
    );

    return NextResponse.json(
      { 
        message: 'User created successfully',
        userId: result.id 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  } finally {
    db.close();
  }
}