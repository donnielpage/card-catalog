import express from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import { sessionStorage } from '../utils/sessionStorage';
import { upload, validateFileUpload } from '../utils/fileHandler';
import { UploadSession, QRResponse, UploadResponse } from '../types';

const router = express.Router();

// Generate QR code for mobile upload
router.post('/qr', authenticateToken, async (req, res) => {
  try {
    // Clean up expired sessions
    sessionStorage.cleanup();

    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create upload session
    const uploadSession: UploadSession = {
      id: sessionId,
      userId: req.user!.id,
      tenantId: req.user!.tenant_id || '',
      createdAt: new Date(),
      status: 'waiting'
    };
    
    sessionStorage.set(sessionId, uploadSession);

    // Generate mobile upload URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
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

    const response: QRResponse = {
      sessionId,
      qrCode: qrCodeDataUrl,
      mobileUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    };

    res.json(response);
  } catch (error: any) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Check session status
router.get('/qr', authenticateToken, (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    sessionStorage.cleanup();

    const uploadSession = sessionStorage.get(sessionId);
    if (!uploadSession) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Verify session belongs to current user
    if (uploadSession.userId !== req.user!.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      status: uploadSession.status,
      imageUrl: uploadSession.imageUrl
    });
  } catch (error: any) {
    console.error('Session check error:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

// Mobile upload endpoint
router.post('/:sessionId', upload.single('image'), (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get the upload session
    const uploadSession = sessionStorage.get(sessionId);
    if (!uploadSession) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (uploadSession.status !== 'waiting') {
      return res.status(400).json({ error: 'Session already used or expired' });
    }

    validateFileUpload(req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Update session with uploaded image
    const imageUrl = `/uploads/${req.file.filename}`;
    uploadSession.imageUrl = imageUrl;
    uploadSession.status = 'uploaded';

    const response: UploadResponse = {
      message: 'File uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename,
      sessionId: sessionId
    };

    res.json(response);
  } catch (error: any) {
    console.error('Mobile upload error:', error);
    res.status(400).json({ error: error.message || 'Failed to upload file' });
  }
});

// Get session info for mobile page
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    const uploadSession = sessionStorage.get(sessionId);
    if (!uploadSession) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
      sessionId,
      status: uploadSession.status,
      createdAt: uploadSession.createdAt,
      imageUrl: uploadSession.imageUrl
    });
  } catch (error: any) {
    console.error('Session info error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

export default router;