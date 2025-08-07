import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Database from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  // Users can only update their own favorites, unless they're admin
  if (session.user.id !== id && session.user.role !== 'admin') {
    console.log('Authorization failed:', { sessionUserId: session.user.id, paramId: id, userRole: session.user.role });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = new Database();
  try {
    const { favorite_team_id, favorite_player_id } = await request.json();
    
    console.log('Updating favorites for user:', userId, { favorite_team_id, favorite_player_id });

    await db.run(
      'UPDATE users SET favorite_team_id = ?, favorite_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [favorite_team_id, favorite_player_id, userId]
    );
    
    console.log('Favorites updated successfully');

    const updatedUser = await db.get(
      'SELECT id, username, email, firstname, lastname, role, favorite_team_id, favorite_player_id, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user favorites:', error);
    return NextResponse.json({ error: 'Failed to update favorites' }, { status: 500 });
  } finally {
    db.close();
  }
}