import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canModify } from '@/lib/auth';
import { CardService } from '@/lib/cardService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cardService = new CardService();
  try {
    const { id } = await params;
    const card = await cardService.getCardById(parseInt(id));
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
    return NextResponse.json({ error: 'Unauthorized. Manager permissions required.' }, { status: 401 });
  }

  const cardService = new CardService();
  try {
    const { id } = await params;
    const card = await request.json();
    
    // Validate that the card exists before updating
    const existingCard = await cardService.getCardById(parseInt(id));
    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    await cardService.updateCard(parseInt(id), card);
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
    return NextResponse.json({ error: 'Unauthorized. Manager permissions required.' }, { status: 401 });
  }

  const cardService = new CardService();
  try {
    const { id } = await params;
    
    // Get the card first to check if it has an image to delete
    const existingCard = await cardService.getCardById(parseInt(id));
    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // Delete the card
    await cardService.deleteCard(parseInt(id));
    
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