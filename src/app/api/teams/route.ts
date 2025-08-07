import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/cardService';

export async function GET() {
  const cardService = new CardService();
  try {
    const teams = await cardService.getAllTeams();
    return NextResponse.json(teams);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function POST(request: NextRequest) {
  const cardService = new CardService();
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