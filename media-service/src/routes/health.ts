import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    service: 'media-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;