import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';

export async function GET(request: NextRequest) {
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
  
  console.log('Players GET - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const players = await cardService.getAllPlayers();
    console.log('Players GET - Returning players:', players.map(p => ({ id: p.id, name: `${p.firstname} ${p.lastname}`, tenant_id: p.tenant_id || 'NO_TENANT_ID' })));
    return NextResponse.json(players);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function POST(request: NextRequest) {
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
  
  console.log('Players POST - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const player = await request.json();
    const id = await cardService.createPlayer(player);
    const newPlayer = { id, ...player };
    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  } finally {
    cardService.close();
  }
}