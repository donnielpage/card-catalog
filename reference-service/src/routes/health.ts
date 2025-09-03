import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    service: 'reference-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    features: [
      'players',
      'teams', 
      'manufacturers',
      'multi-tenant',
      'authentication'
    ]
  });
});

export default router;