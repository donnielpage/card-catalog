import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canModify } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !canModify(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await request.json();

    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    // Extract filename from URL
    const filename = path.basename(imageUrl);
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

    // Check if file exists and delete it
    if (existsSync(filepath)) {
      await unlink(filepath);
      return NextResponse.json({ message: 'Image deleted successfully' });
    } else {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}