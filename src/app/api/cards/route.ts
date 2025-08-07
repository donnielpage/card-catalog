import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/cardService';

export async function GET() {
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
  const cardService = new CardService();
  try {
    const card = await request.json();
    const id = await cardService.createCard(card);
    return NextResponse.json({ id }, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  } finally {
    cardService.close();
  }
}