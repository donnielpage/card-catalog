import express from 'express';
import { ReferenceDataService } from '../services/referenceDataService';
import { authenticateToken, requireReadPermission, requireWritePermission } from '../middleware/auth';
import { Manufacturer } from '../types';

const router = express.Router();

// GET /api/manufacturers - Get all manufacturers
router.get('/', authenticateToken, requireReadPermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    console.log('Manufacturers GET - Tenant context:', req.tenantContext);
    const manufacturers = await service.getAllManufacturers();
    console.log(`Manufacturers GET - Found ${manufacturers.length} manufacturers`);
    res.json(manufacturers);
  } catch (error: any) {
    console.error('Failed to fetch manufacturers:', error);
    res.status(500).json({ error: 'Failed to fetch manufacturers' });
  } finally {
    await service.close();
  }
});

// POST /api/manufacturers - Create new manufacturer
router.post('/', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    console.log('Manufacturers POST - Tenant context:', req.tenantContext);
    const manufacturerData: Omit<Manufacturer, 'id'> = req.body;
    
    // Validate required fields
    if (!manufacturerData.company) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    const id = await service.createManufacturer(manufacturerData);
    const newManufacturer = { id, ...manufacturerData };
    
    console.log('Manufacturers POST - Created manufacturer:', newManufacturer);
    res.status(201).json(newManufacturer);
  } catch (error: any) {
    console.error('Failed to create manufacturer:', error);
    res.status(500).json({ error: 'Failed to create manufacturer' });
  } finally {
    await service.close();
  }
});

// GET /api/manufacturers/:id - Get specific manufacturer
router.get('/:id', authenticateToken, requireReadPermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const manufacturer = await service.getManufacturerById(id);
    
    if (!manufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }
    
    res.json(manufacturer);
  } catch (error: any) {
    console.error('Failed to fetch manufacturer:', error);
    res.status(500).json({ error: 'Failed to fetch manufacturer' });
  } finally {
    await service.close();
  }
});

// PUT /api/manufacturers/:id - Update manufacturer
router.put('/:id', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const manufacturerData: Partial<Manufacturer> = req.body;
    
    console.log('Manufacturers PUT - Updating manufacturer:', { id, manufacturerData });
    const success = await service.updateManufacturer(id, manufacturerData);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Manufacturer not found or no changes made' });
    }
  } catch (error: any) {
    console.error('Failed to update manufacturer:', error);
    res.status(500).json({ error: 'Failed to update manufacturer' });
  } finally {
    await service.close();
  }
});

// DELETE /api/manufacturers/:id - Delete manufacturer
router.delete('/:id', authenticateToken, requireWritePermission, async (req, res) => {
  const service = new ReferenceDataService(req.tenantContext);
  
  try {
    const { id } = req.params;
    const success = await service.deleteManufacturer(id);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Manufacturer not found' });
    }
  } catch (error: any) {
    console.error('Failed to delete manufacturer:', error);
    res.status(500).json({ error: 'Failed to delete manufacturer' });
  } finally {
    await service.close();
  }
});

export default router;