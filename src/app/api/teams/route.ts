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
  
  console.log('Teams GET - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const teams = await cardService.getAllTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
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
  
  console.log('Teams POST - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const team = await request.json();
    const id = await cardService.createTeam(team);
    const newTeam = { id, ...team };
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  } finally {
    cardService.close();
  }
}