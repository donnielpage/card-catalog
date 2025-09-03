import express from 'express';
import { upload, validateFileUpload } from '../utils/fileHandler';
import { authenticateToken, requireCreatePermission } from '../middleware/auth';
import { UploadResponse } from '../types';

const router = express.Router();

// Standard file upload endpoint
router.post('/', authenticateToken, requireCreatePermission, upload.single('image'), (req, res) => {
  try {
    validateFileUpload(req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    const response: UploadResponse = {
      message: 'File uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    };

    res.json(response);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message || 'Failed to upload file' });
  }
});

// File deletion endpoint
router.delete('/delete', authenticateToken, requireCreatePermission, (req, res) => {
  // Implementation for file deletion
  // This would be moved from the main app's delete endpoint
  res.json({ message: 'Delete endpoint - to be implemented' });
});

export default router;