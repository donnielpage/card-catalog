import { Router, Response } from 'express';
import Joi from 'joi';
import { UserService } from '../services/userService';
import { createAuthMiddleware, extractTenantMiddleware } from '../middleware/auth';
import { AuthenticatedRequest, UpdateUserRequest } from '../types';

const router = Router();

// Validation schemas
const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid('admin', 'user').optional(),
  is_active: Joi.boolean().optional()
}).min(1);

const passwordUpdateSchema = Joi.object({
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});

export function createUserRoutes(userService: UserService, jwtSecret: string) {
  // Apply authentication middleware to all routes
  const authMiddleware = createAuthMiddleware({ jwtSecret });
  router.use(authMiddleware);
  router.use(extractTenantMiddleware);

  // GET /users - Get all users (admin only)
  router.get('/', createAuthMiddleware({ jwtSecret, requiredRole: 'admin' }), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit > 100) {
        return res.status(400).json({ error: 'Limit cannot exceed 100' });
      }

      const users = await userService.getAllUsers(tenantId, limit, offset);
      
      res.json({
        users,
        pagination: {
          limit,
          offset,
          count: users.length
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  });

  // GET /users/:id - Get specific user
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      
      // Users can only access their own data unless they're admin
      if (req.user!.role !== 'admin' && req.user!.userId !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await userService.getUserById(id, tenantId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  });

  // PUT /users/:id - Update user
  router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      
      // Users can only update their own data unless they're admin
      if (req.user!.role !== 'admin' && req.user!.userId !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { error, value } = updateUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const updateData: UpdateUserRequest = value;

      // Non-admin users cannot change role or is_active
      if (req.user!.role !== 'admin') {
        delete updateData.role;
        delete updateData.is_active;
      }

      const updatedUser = await userService.updateUser(id, tenantId, updateData);
      
      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update user';
      
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /users/:id - Delete user (admin only)
  router.delete('/:id', createAuthMiddleware({ jwtSecret, requiredRole: 'admin' }), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      // Prevent admin from deleting themselves
      if (req.user!.userId === id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await userService.deleteUser(id, tenantId);
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /users/:id/password - Update user password
  router.put('/:id/password', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      
      // Users can only update their own password unless they're admin
      if (req.user!.role !== 'admin' && req.user!.userId !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { error, value } = passwordUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      await userService.updatePassword(id, tenantId, value.password);
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update password';
      
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /users/:id/activate - Activate user (admin only)
  router.post('/:id/activate', createAuthMiddleware({ jwtSecret, requiredRole: 'admin' }), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      const updatedUser = await userService.updateUser(id, tenantId, { is_active: true });
      
      res.json({
        message: 'User activated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Activate user error:', error);
      const message = error instanceof Error ? error.message : 'Failed to activate user';
      
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /users/:id/deactivate - Deactivate user (admin only)
  router.post('/:id/deactivate', createAuthMiddleware({ jwtSecret, requiredRole: 'admin' }), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      // Prevent admin from deactivating themselves
      if (req.user!.userId === id) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      const updatedUser = await userService.updateUser(id, tenantId, { is_active: false });
      
      res.json({
        message: 'User deactivated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      const message = error instanceof Error ? error.message : 'Failed to deactivate user';
      
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}