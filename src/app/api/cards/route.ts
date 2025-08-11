import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CardService } from '@/lib/cardService';
import { validateCard } from '@/lib/validation';

export async function GET() {
  // Require authentication to view cards
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cardService = new CardService();
  try {
    const cards = await cardService.getAllCards();
    return NextResponse.json(cards);
  } catch (_error) {
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

  const cardService = new CardService();
  try {
    const card = await request.json();
    
    // Validate input data
    const validation = validateCard(card);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    const id = await cardService.createCard(card);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Card creation error (no sensitive data):', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  } finally {
    cardService.close();
  }
}