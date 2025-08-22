import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CardService } from '@/lib/cardService';
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

  // Create tenant context directly from user session
  const tenantContext = session.user.tenant_id ? {
    tenantId: session.user.tenant_id,
    tenantSlug: session.user.tenant_slug!,
    tenantName: session.user.tenant_name!
  } : undefined;
  
  console.log('Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
    try {
      const { id } = await params;
      const playerData = await request.json();
      
      // First, let's check if this player exists in this tenant
      const existingPlayer = await cardService.db.get(
        'SELECT id, firstname, lastname, tenant_id FROM players WHERE id = $1', 
        [id]
      );
      console.log('Player existence check:', existingPlayer);
      
      // Also check what players exist in Nathan's tenant
      const tenantPlayers = await cardService.db.all(
        'SELECT id, firstname, lastname, tenant_id FROM players WHERE tenant_id = $1', 
        [tenantContext?.tenantId]
      );
      console.log('Players in Nathan\'s tenant:', tenantPlayers);
      
      console.log('Updating player:', { id, playerData });
      const success = await cardService.updatePlayer(id, playerData);
      console.log('Update result:', success);
      
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ error: 'Failed to update player' }, { status: 400 });
      }
    } catch (error) {
      console.error('Error updating player:', error);
      return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cardService = new CardService();
  try {
    const { id } = await params;
    await cardService.deletePlayer(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  } finally {
    cardService.close();
  }
}