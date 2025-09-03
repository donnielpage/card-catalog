import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canModify } from '@/lib/auth';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';
import { validateCard } from '@/lib/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  
  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const { id } = await params;
    const card = await cardService.getCardById(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication and permissions
  const session = await getServerSession(authOptions);
  if (!session || !canModify(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized. User permissions required.' }, { status: 401 });
  }

  // Create tenant context directly from user session
  const tenantContext = session.user.tenant_id ? {
    tenantId: session.user.tenant_id,
    tenantSlug: session.user.tenant_slug!,
    tenantName: session.user.tenant_name!
  } : undefined;

  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const { id } = await params;
    const card = await request.json();
    
    // Validate input data
    const validation = validateCard(card);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    // Validate that the card exists before updating
    const existingCard = await cardService.getCardById(id);
    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    await cardService.updateCard(id, card);
    return NextResponse.json({ success: true, message: 'Card updated successfully' });
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication and permissions
  const session = await getServerSession(authOptions);
  if (!session || !canModify(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized. User permissions required.' }, { status: 401 });
  }

  // Create tenant context directly from user session
  const tenantContext = session.user.tenant_id ? {
    tenantId: session.user.tenant_id,
    tenantSlug: session.user.tenant_slug!,
    tenantName: session.user.tenant_name!
  } : undefined;

  const cardService = new TenantAwareCardService(tenantContext);
  try {
    const { id } = await params;
    
    // Get the card first to check if it has an image to delete
    const existingCard = await cardService.getCardById(id);
    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // Delete the card
    await cardService.deleteCard(id);
    
    // TODO: Clean up image file if it exists and is a local upload
    // if (existingCard.imageurl && existingCard.imageurl.startsWith('/uploads/')) {
    //   // Delete the image file
    // }
    
    return NextResponse.json({ success: true, message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  } finally {
    cardService.close();
  }
}