import { Router, Response } from 'express';
import Joi from 'joi';
import { TenantService } from '../services/tenantService';
import { createAuthMiddleware, createRateLimitMiddleware, tenantAuditMiddleware } from '../middleware/auth';
import { AuthenticatedRequest, CreateTenantRequest, UpdateTenantRequest } from '../types';

const router = Router();

// Validation schemas
const createTenantSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().min(2).max(50).pattern(/^[a-z0-9-]+$/).optional(),
  subscription_tier: Joi.string().valid('free', 'pro', 'enterprise').default('free'),
  max_users: Joi.number().integer().min(1).max(1000).default(10),
  admin_email: Joi.string().email().optional(),
  admin_name: Joi.string().min(2).max(100).optional()
});

const updateTenantSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  slug: Joi.string().min(2).max(50).pattern(/^[a-z0-9-]+$/).optional(),
  subscription_tier: Joi.string().valid('free', 'pro', 'enterprise').optional(),
  max_users: Joi.number().integer().min(1).max(1000).optional(),
  status: Joi.string().valid('active', 'suspended', 'pending').optional()
}).min(1);

export function createTenantRoutes(tenantService: TenantService, jwtSecret: string) {
  // Apply authentication middleware - require global admin for all tenant operations
  const authMiddleware = createAuthMiddleware({ jwtSecret, requireGlobalAdmin: true });
  const rateLimitMiddleware = createRateLimitMiddleware();
  
  router.use(authMiddleware);
  router.use(rateLimitMiddleware);
  router.use(tenantAuditMiddleware());

  // GET /tenants - Get all tenants
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit > 100) {
        return res.status(400).json({ 
          success: false,
          error: 'Limit cannot exceed 100' 
        });
      }

      const tenants = await tenantService.getAllTenants(limit, offset);
      
      res.json({
        success: true,
        data: {
          tenants,
          pagination: {
            limit,
            offset,
            count: tenants.length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get tenants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenants'
      });
    }
  });

  // GET /tenants/stats - Get tenant statistics
  router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await tenantService.getTenantStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get tenant stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenant statistics'
      });
    }
  });

  // GET /tenants/usage - Get tenant usage information
  router.get('/usage', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const usage = await tenantService.getTenantUsage();
      
      res.json({
        success: true,
        data: {
          usage,
          summary: {
            total_tenants: usage.length,
            over_50_percent: usage.filter(u => u.usage_percentage > 50).length,
            over_80_percent: usage.filter(u => u.usage_percentage > 80).length,
            at_capacity: usage.filter(u => u.usage_percentage >= 100).length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get tenant usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenant usage'
      });
    }
  });

  // GET /tenants/:id - Get specific tenant
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const tenant = await tenantService.getTenantById(id);
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: tenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenant'
      });
    }
  });

  // GET /tenants/slug/:slug - Get tenant by slug
  router.get('/slug/:slug', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { slug } = req.params;
      
      const tenant = await tenantService.getTenantBySlug(slug);
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: tenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get tenant by slug error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenant'
      });
    }
  });

  // POST /tenants - Create new tenant
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { error, value } = createTenantSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const createTenantRequest: CreateTenantRequest = value;
      const tenant = await tenantService.createTenant(createTenantRequest);
      
      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: tenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Create tenant error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create tenant';
      
      if (message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // PUT /tenants/:id - Update tenant
  router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const { error, value } = updateTenantSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const updateData: UpdateTenantRequest = value;
      const updatedTenant = await tenantService.updateTenant(id, updateData);
      
      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: updatedTenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update tenant';
      
      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: message
        });
      }
      
      if (message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // DELETE /tenants/:id - Delete tenant
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      await tenantService.deleteTenant(id);
      
      res.json({
        success: true,
        message: 'Tenant deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete tenant error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete tenant';
      
      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // POST /tenants/:id/suspend - Suspend tenant
  router.post('/:id/suspend', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const updatedTenant = await tenantService.updateTenant(id, { status: 'suspended' });
      
      res.json({
        success: true,
        message: 'Tenant suspended successfully',
        data: updatedTenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Suspend tenant error:', error);
      const message = error instanceof Error ? error.message : 'Failed to suspend tenant';
      
      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // POST /tenants/:id/activate - Activate tenant
  router.post('/:id/activate', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const updatedTenant = await tenantService.updateTenant(id, { status: 'active' });
      
      res.json({
        success: true,
        message: 'Tenant activated successfully',
        data: updatedTenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Activate tenant error:', error);
      const message = error instanceof Error ? error.message : 'Failed to activate tenant';
      
      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}