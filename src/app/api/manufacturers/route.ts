import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/cardService';

export async function GET() {
  const cardService = new CardService();
  try {
    const manufacturers = await cardService.getAllManufacturers();
    return NextResponse.json(manufacturers);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
  } finally {
    cardService.close();
  }
}

export async function POST(request: NextRequest) {
  const cardService = new CardService();
  try {
    const manufacturer = await request.json();
    const id = await cardService.createManufacturer(manufacturer);
    const newManufacturer = { id, ...manufacturer };
    return NextResponse.json(newManufacturer, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to create manufacturer' }, { status: 500 });
  } finally {
    cardService.close();
  }
}