import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/cardService';

export async function GET() {
  const cardService = new CardService();
  try {
    const players = await cardService.getAllPlayers();
    return NextResponse.json(players);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function POST(request: NextRequest) {
  const cardService = new CardService();
  try {
    const player = await request.json();
    const id = await cardService.createPlayer(player);
    const newPlayer = { id, ...player };
    return NextResponse.json(newPlayer, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  } finally {
    cardService.close();
  }
}