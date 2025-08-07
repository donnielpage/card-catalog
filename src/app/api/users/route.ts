import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageUsers } from '@/lib/auth';
import Database from '@/lib/database';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = new Database();
  try {
    const users = await db.all(
      'SELECT id, username, email, firstname, lastname, role, favorite_team_id, favorite_player_id, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = new Database();
  try {
    const { username, email, firstname, lastname, password, role } = await request.json();

    if (!username || !email || !firstname || !lastname || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.run(
      'INSERT INTO users (username, email, firstname, lastname, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, firstname, lastname, passwordHash, role]
    );

    const newUser = await db.get(
      'SELECT id, username, email, firstname, lastname, role, favorite_team_id, favorite_player_id, created_at, updated_at FROM users WHERE id = ?',
      [result.id]
    );

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  } finally {
    db.close();
  }
}