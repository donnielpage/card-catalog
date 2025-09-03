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

    // Extract and validate filename from URL
    const filename = path.basename(imageUrl);
    
    // Validate filename contains only safe characters (alphanumeric, hyphens, underscores, dots)
    const safeFilenameRegex = /^[a-zA-Z0-9\-_.]+$/;
    if (!safeFilenameRegex.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename format' }, { status: 400 });
    }
    
    // Prevent directory traversal by ensuring the resolved path is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filepath = path.join(uploadsDir, filename);
    const resolvedPath = path.resolve(filepath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    // Ensure the resolved path is within the uploads directory
    if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep) && resolvedPath !== resolvedUploadsDir) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

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