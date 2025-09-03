import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { sessionStorage, cleanupExpiredSessions, type UploadSession } from '@/lib/session-storage';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean up expired sessions
    cleanupExpiredSessions();

    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create upload session
    const uploadSession: UploadSession = {
      id: sessionId,
      userId: session.user.id,
      tenantId: session.user.tenant_id,
      createdAt: new Date(),
      status: 'waiting'
    };
    
    sessionStorage.set(sessionId, uploadSession);

    // Generate mobile upload URL with environment-aware configuration
    const isDevelopment = process.env.NODE_ENV === 'development';
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 
                     request.headers.get('x-forwarded-protocol') || 
                     (host.includes('localhost') || isDevelopment ? 'http' : 'https');
    
    let baseUrl: string;
    if (process.env.NEXTAUTH_URL) {
      // Use configured URL (production with DNS or development with IP)
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (isDevelopment) {
      // Development fallback: use request host (could be IP or localhost)
      baseUrl = `${protocol}://${host}`;
    } else {
      // Production fallback (should not happen - requires DNS name)
      console.warn('Production deployment missing NEXTAUTH_URL! QR codes may not work properly.');
      baseUrl = `${protocol}://${host}`;
    }
    
    const mobileUrl = `${baseUrl}/mobile-upload/${sessionId}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return NextResponse.json({
      sessionId,
      qrCode: qrCodeDataUrl,
      mobileUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    });

  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Clean up expired sessions
    cleanupExpiredSessions();

    const uploadSession = sessionStorage.get(sessionId);
    if (!uploadSession) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    // Verify session belongs to current user
    if (uploadSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      status: uploadSession.status,
      imageUrl: uploadSession.imageUrl
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Failed to check session' }, { status: 500 });
  }
}

// Export the session storage for use by mobile upload endpoint  
export { sessionStorage };