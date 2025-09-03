import express from 'express';
import { ReferenceDataService } from '../services/referenceDataService';
import { authenticateToken, requireReadPermission, requireWritePermission } from '../middleware/auth';
import { Player } from '../types';

const router = express.Router();

// GET /api/players - Get all players
router.get('/', authenticateToken, requireReadPermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    console.log('Players GET - Tenant context:', req.tenantContext);
    const players = await service.getAllPlayers();
    console.log(`Players GET - Found ${players.length} players`);
    res.json(players);
  } catch (error: any) {
    console.error('Failed to fetch players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  } finally {
    await service.close();
  }
});

// POST /api/players - Create new player
router.post('/', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    console.log('Players POST - Tenant context:', req.tenantContext);
    const playerData: Omit<Player, 'id'> = req.body;
    
    // Validate required fields
    if (!playerData.firstname || !playerData.lastname) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    const id = await service.createPlayer(playerData);
    const newPlayer = { id, ...playerData };
    
    console.log('Players POST - Created player:', newPlayer);
    res.status(201).json(newPlayer);
  } catch (error: any) {
    console.error('Failed to create player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  } finally {
    await service.close();
  }
});

// GET /api/players/:id - Get specific player
router.get('/:id', authenticateToken, requireReadPermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const player = await service.getPlayerById(id);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error: any) {
    console.error('Failed to fetch player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  } finally {
    await service.close();
  }
});

// PUT /api/players/:id - Update player
router.put('/:id', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const playerData: Partial<Player> = req.body;
    
    console.log('Players PUT - Updating player:', { id, playerData });
    const success = await service.updatePlayer(id, playerData);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Player not found or no changes made' });
    }
  } catch (error: any) {
    console.error('Failed to update player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  } finally {
    await service.close();
  }
});

// DELETE /api/players/:id - Delete player
router.delete('/:id', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const success = await service.deletePlayer(id);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (error: any) {
    console.error('Failed to delete player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  } finally {
    await service.close();
  }
});

export default router;