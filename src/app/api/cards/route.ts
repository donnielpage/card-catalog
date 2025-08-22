import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';
import { withTenantContext } from '@/lib/tenant-middleware';
import { validateCard } from '@/lib/validation';
import { TenantContext } from '@/lib/database-pg';

export async function GET(request: NextRequest) {
  // Require authentication to view cards
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
  
  console.log('Cards GET - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const cards = await cardService.getAllCards();
    return NextResponse.json(cards);
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function POST(request: NextRequest) {
  // Require authentication and create permission
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Import canCreate function
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
  
  console.log('Cards POST - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const card = await request.json();
    console.log('Cards POST - Card data received:', card);
    
    // Validate input data
    const validation = validateCard(card);
    if (!validation.isValid) {
      console.log('Cards POST - Validation failed:', validation.errors);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    const id = await cardService.createCard(card);
    console.log('Cards POST - Card created with ID:', id);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Card creation error:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  } finally {
    cardService.close();
  }
}