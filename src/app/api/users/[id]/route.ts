import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageUsers } from '@/lib/auth';
import Database from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = new Database();
  try {
    const { username, email, firstname, lastname, role, password } = await request.json();
    const userId = parseInt(params.id);

    if (!username || !email || !firstname || !lastname || !role) {
      return NextResponse.json(
        { error: 'Username, email, firstname, lastname, and role are required' },
        { status: 400 }
      );
    }

    // Check if username/email is already taken by another user
    const existingUser = await db.get(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, userId]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already taken by another user' },
        { status: 409 }
      );
    }

    let updateQuery = 'UPDATE users SET username = ?, email = ?, firstname = ?, lastname = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    let params_array = [username, email, firstname, lastname, role, userId];

    // If password is provided, hash and update it
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      updateQuery = 'UPDATE users SET username = ?, email = ?, firstname = ?, lastname = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params_array = [username, email, firstname, lastname, role, passwordHash, userId];
    }

    await db.run(updateQuery, params_array);

    const updatedUser = await db.get(
      'SELECT id, username, email, firstname, lastname, role, favorite_team_id, favorite_player_id, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = new Database();
  try {
    const userId = parseInt(params.id);

    // Prevent deleting own account
    if (userId.toString() === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  } finally {
    db.close();
  }
}