import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  
  console.log('Teams [id] GET - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const { id } = await params;
    console.log('Fetching team with ID:', id, 'for tenant:', tenantContext?.tenantId);
    
    // For multi-tenant, teams use UUIDs, for SQLite they use integers
    const teams = await cardService.getAllTeams();
    console.log('Found teams:', teams.length, 'looking for ID:', id);
    
    const team = teams.find(t => String(t.id) === id);
    if (!team) {
      console.log('Team not found. Available team IDs:', teams.map(t => t.id));
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    console.log('Found team:', team);
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { canCreate } = await import('@/lib/auth');
  if (!canCreate(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Create tenant context directly from user session
  const tenantContext = session.user.tenant_id ? {
    tenantId: session.user.tenant_id,
    tenantSlug: session.user.tenant_slug!,
    tenantName: session.user.tenant_name!
  } : undefined;
  
  console.log('Teams [id] PUT - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const { id } = await params;
    const teamData = await request.json();
    
    const success = await cardService.updateTeam(id, teamData);
    if (!success) {
      return NextResponse.json({ error: 'Team not found or no changes made' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Team updated successfully' });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  } finally {
    cardService.close();
  }
}