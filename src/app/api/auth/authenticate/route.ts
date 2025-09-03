import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    console.log("Authentication attempt for username:", username);

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(username, password);

    if (!result.user) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Return user data for NextAuth
    return NextResponse.json({
      id: result.user.id.toString(),
      username: result.user.username,
      email: result.user.email,
      firstname: result.user.firstname,
      lastname: result.user.lastname,
      role: result.user.role,
      global_role: result.user.global_role,
      organization_role: result.user.organization_role,
      tenant_id: result.user.tenant_id,
      tenant_name: result.user.tenant_name,
      tenant_slug: result.user.tenant_slug,
      favorite_team_id: result.user.favorite_team_id,
      favorite_player_id: result.user.favorite_player_id,
    });
  } catch (error) {
    console.error('Authentication API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}