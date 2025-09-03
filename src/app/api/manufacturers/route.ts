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
  
  console.log('Manufacturers GET - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const manufacturers = await cardService.getAllManufacturers();
    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error('Failed to fetch manufacturers:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
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
  
  console.log('Manufacturers POST - Direct tenant context from session:', tenantContext);
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const manufacturer = await request.json();
    const id = await cardService.createManufacturer(manufacturer);
    const newManufacturer = { id, ...manufacturer };
    return NextResponse.json(newManufacturer, { status: 201 });
  } catch (error) {
    console.error('Failed to create manufacturer:', error);
    return NextResponse.json({ error: 'Failed to create manufacturer' }, { status: 500 });
  } finally {
    cardService.close();
  }
}