import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/cardService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cardService = new CardService();
  try {
    const { id } = await params;
    const team = await cardService.getTeamById(parseInt(id));
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  } finally {
    cardService.close();
  }
}