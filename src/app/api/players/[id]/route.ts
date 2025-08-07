import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/cardService';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cardService = new CardService();
  try {
    const { id } = await params;
    await cardService.deletePlayer(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  } finally {
    cardService.close();
  }
}