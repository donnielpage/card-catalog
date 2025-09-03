import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { UserService } from '../services/userService';
import { createRateLimitMiddleware } from '../middleware/auth';
import { LoginRequest, CreateUserRequest } from '../types';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'user').default('user')
});

export function createAuthRoutes(userService: UserService) {
  // Apply rate limiting to auth routes
  const rateLimitMiddleware = createRateLimitMiddleware();
  router.use(rateLimitMiddleware);

  // POST /auth/login - Authenticate user
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const loginRequest: LoginRequest = value;
      
      // Extract tenant from header or token (for now, use a default)
      // In production, this would come from subdomain, header, or JWT
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      
      const result = await userService.authenticateUser(loginRequest, tenantId);
      
      // Set HTTP-only cookie for security
      res.cookie('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.expires_in * 1000
      });

      res.json({
        user: result.user,
        expires_in: result.expires_in
      });
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      
      if (message.includes('Invalid credentials') || message.includes('inactive user')) {
        return res.status(401).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /auth/register - Register new user
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const createUserRequest: CreateUserRequest = value;
      
      // Extract tenant from header (for now, use a default)
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      
      const user = await userService.createUser(createUserRequest, tenantId);
      
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      
      if (message.includes('already exists')) {
        return res.status(409).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /auth/logout - Logout user
  router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('auth-token');
    res.json({ message: 'Logged out successfully' });
  });

  // GET /auth/me - Get current user info (requires token)
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }

      const tokenData = userService.verifyToken(token);
      const user = await userService.getUserById(tokenData.userId, tokenData.tenantId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      const message = error instanceof Error ? error.message : 'Failed to get user';
      
      if (message.includes('Invalid') || message.includes('expired')) {
        return res.status(401).json({ error: message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /auth/verify - Verify token validity
  router.post('/verify', (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }

      const tokenData = userService.verifyToken(token);
      
      res.json({
        valid: true,
        user: {
          userId: tokenData.userId,
          email: tokenData.email,
          role: tokenData.role,
          tenantId: tokenData.tenantId
        }
      });
    } catch (error) {
      res.status(401).json({
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  });

  return router;
}