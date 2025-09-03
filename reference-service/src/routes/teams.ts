import express from 'express';
import { ReferenceDataService } from '../services/referenceDataService';
import { authenticateToken, requireReadPermission, requireWritePermission } from '../middleware/auth';
import { Team } from '../types';

const router = express.Router();

// GET /api/teams - Get all teams
router.get('/', authenticateToken, requireReadPermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    console.log('Teams GET - Tenant context:', req.tenantContext);
    const teams = await service.getAllTeams();
    console.log(`Teams GET - Found ${teams.length} teams`);
    res.json(teams);
  } catch (error: any) {
    console.error('Failed to fetch teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  } finally {
    await service.close();
  }
});

// POST /api/teams - Create new team
router.post('/', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    console.log('Teams POST - Tenant context:', req.tenantContext);
    const teamData: Omit<Team, 'id'> = req.body;
    
    // Validate required fields
    if (!teamData.city || !teamData.teamname) {
      return res.status(400).json({ error: 'City and team name are required' });
    }
    
    const id = await service.createTeam(teamData);
    const newTeam = { id, ...teamData };
    
    console.log('Teams POST - Created team:', newTeam);
    res.status(201).json(newTeam);
  } catch (error: any) {
    console.error('Failed to create team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  } finally {
    await service.close();
  }
});

// GET /api/teams/:id - Get specific team
router.get('/:id', authenticateToken, requireReadPermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const team = await service.getTeamById(id);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(team);
  } catch (error: any) {
    console.error('Failed to fetch team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  } finally {
    await service.close();
  }
});

// PUT /api/teams/:id - Update team
router.put('/:id', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const teamData: Partial<Team> = req.body;
    
    console.log('Teams PUT - Updating team:', { id, teamData });
    const success = await service.updateTeam(id, teamData);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Team not found or no changes made' });
    }
  } catch (error: any) {
    console.error('Failed to update team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  } finally {
    await service.close();
  }
});

// DELETE /api/teams/:id - Delete team
router.delete('/:id', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const success = await service.deleteTeam(id);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Team not found' });
    }
  } catch (error: any) {
    console.error('Failed to delete team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  } finally {
    await service.close();
  }
});

export default router;