import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { sessionStorage } from '@/lib/session-storage';

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;

    // Get the upload session
    const uploadSession = sessionStorage.get(sessionId);
    if (!uploadSession) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    if (uploadSession.status !== 'waiting') {
      return NextResponse.json({ error: 'Session already used or expired' }, { status: 400 });
    }

    const data = await request.formData();
    const file: File | null = data.get('image') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.name);
    const filename = `mobile-${uniqueSuffix}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Update session with uploaded image
    const imageUrl = `/uploads/${filename}`;
    uploadSession.imageUrl = imageUrl;
    uploadSession.status = 'uploaded';

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      imageUrl: imageUrl,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Mobile upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;

    // Get the upload session
    const uploadSession = sessionStorage.get(sessionId);
    if (!uploadSession) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    // Return session info for mobile page rendering
    return NextResponse.json({
      sessionId,
      status: uploadSession.status,
      createdAt: uploadSession.createdAt,
      imageUrl: uploadSession.imageUrl
    });

  } catch (error) {
    console.error('Session info error:', error);
    return NextResponse.json({ error: 'Failed to get session info' }, { status: 500 });
  }
}