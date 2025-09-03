import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';
import { withTenantContext } from '@/lib/tenant-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Users can only update their own favorites, unless they're admin
  if (session.user.id !== id && session.user.role !== 'admin') {
    console.log('Authorization failed: User attempted to update another user\'s favorites');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create tenant context directly from user session
  const tenantContext = session.user.tenant_id ? {
    tenantId: session.user.tenant_id,
    tenantSlug: session.user.tenant_slug!,
    tenantName: session.user.tenant_name!
  } : undefined;
  
  console.log('Favorites PUT - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const { favorite_team_id, favorite_player_id } = await request.json();
    
    console.log('Updating user favorites:', {
      userId: id,
      favorite_team_id,
      favorite_player_id,
      tenantContext
    });

    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    if (isMultiTenant) {
      // PostgreSQL mode - use UUIDs
      await cardService.db.run(
        'UPDATE users SET favorite_team_id = $1, favorite_player_id = $2, updated_at = NOW() WHERE id = $3',
        [favorite_team_id || null, favorite_player_id || null, id]
      );
    } else {
      // SQLite mode - use integers
      await cardService.db.run(
        'UPDATE users SET favorite_team_id = ?, favorite_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [favorite_team_id || null, favorite_player_id || null, parseInt(id)]
      );
    }
    
    console.log('Favorites updated successfully');

    // Get updated user with full session information
    const updatedUser = await cardService.db.get(
      isMultiTenant 
        ? `SELECT u.id, u.username, u.email, u.firstname, u.lastname, u.role, u.tenant_id, u.tenant_role, u.organization_role, 
                  t.name as tenant_name, t.slug as tenant_slug, u.favorite_team_id, u.favorite_player_id 
           FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1`
        : 'SELECT id, username, email, firstname, lastname, role, favorite_team_id, favorite_player_id FROM users WHERE id = ?',
      [isMultiTenant ? id : parseInt(id)]
    );

    console.log('Updated user data:', updatedUser);

    // Ensure the response is serializable by converting dates and handling nulls
    const serializedUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      role: updatedUser.role,
      tenant_id: updatedUser.tenant_id,
      tenant_role: updatedUser.tenant_role,
      organization_role: updatedUser.organization_role,
      tenant_name: updatedUser.tenant_name,
      tenant_slug: updatedUser.tenant_slug,
      favorite_team_id: updatedUser.favorite_team_id,
      favorite_player_id: updatedUser.favorite_player_id
    };

    return NextResponse.json(serializedUser);
  } catch (error) {
    console.error('Error updating user favorites:', error);
    return NextResponse.json({ error: 'Failed to update favorites' }, { status: 500 });
  } finally {
    cardService.close();
  }
}