import { Router } from 'express';
import CardService from '../services/cardService';
import { AuthenticatedRequest } from '../types';
import { 
  authenticateToken, 
  requireRole, 
  extractTenantContext 
} from '../middleware/auth';
import { 
  validateCreateCard, 
  validateUpdateCard, 
  validateUUID, 
  validateSearchQuery 
} from '../middleware/validation';

export default function createCardRoutes(cardService: CardService) {
  const router = Router();

  // Apply authentication and tenant context to all routes
  router.use(authenticateToken);
  router.use(extractTenantContext);

  // GET /cards - Get all cards
  router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
      const cards = await cardService.getAllCards(req.tenantContext!);
      res.json(cards);
    } catch (error) {
      console.error('Error fetching cards:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /cards/search - Search cards
  router.get('/search', validateSearchQuery, async (req: AuthenticatedRequest, res) => {
    try {
      const query = req.query.q as string;
      const cards = await cardService.searchCards(query.trim(), req.tenantContext!);
      res.json(cards);
    } catch (error) {
      console.error('Error searching cards:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /cards/stats - Get card statistics
  router.get('/stats', async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await cardService.getCardStats(req.tenantContext!);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching card stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /cards/:id - Get card by ID
  router.get('/:id', validateUUID('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const card = await cardService.getCardById(req.params.id, req.tenantContext!);
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      res.json(card);
    } catch (error) {
      console.error('Error fetching card:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /cards - Create new card
  router.post('/', validateCreateCard, async (req: AuthenticatedRequest, res) => {
    try {
      const card = await cardService.createCard(req.body, req.tenantContext!);
      res.status(201).json(card);
    } catch (error) {
      console.error('Error creating card:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid reference ID')) {
          return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key')) {
          return res.status(409).json({ error: 'Card with this number and year already exists' });
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /cards/:id - Update card
  router.put('/:id', validateUUID('id'), validateUpdateCard, async (req: AuthenticatedRequest, res) => {
    try {
      const card = await cardService.updateCard(req.params.id, req.body, req.tenantContext!);
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      res.json(card);
    } catch (error) {
      console.error('Error updating card:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid reference ID')) {
          return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key')) {
          return res.status(409).json({ error: 'Card with this number and year already exists' });
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /cards/:id - Delete card
  router.delete('/:id', requireRole(['admin', 'global_admin']), validateUUID('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const success = await cardService.deleteCard(req.params.id, req.tenantContext!);
      if (!success) {
        return res.status(404).json({ error: 'Card not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting card:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}