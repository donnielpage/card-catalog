import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const createCardSchema = Joi.object({
  cardnumber: Joi.string().required().max(50),
  year: Joi.number().integer().min(1800).max(new Date().getFullYear() + 1).required(),
  description: Joi.string().max(1000).optional(),
  grade: Joi.string().max(20).optional(),
  playerid: Joi.string().uuid().optional(),
  teamid: Joi.string().uuid().optional(),
  manufacturerid: Joi.string().uuid().optional()
});

const updateCardSchema = Joi.object({
  cardnumber: Joi.string().max(50).optional(),
  year: Joi.number().integer().min(1800).max(new Date().getFullYear() + 1).optional(),
  description: Joi.string().max(1000).optional(),
  grade: Joi.string().max(20).optional(),
  playerid: Joi.string().uuid().optional(),
  teamid: Joi.string().uuid().optional(),
  manufacturerid: Joi.string().uuid().optional()
}).min(1);

export const validateCreateCard = (req: Request, res: Response, next: NextFunction) => {
  const { error } = createCardSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

export const validateUpdateCard = (req: Request, res: Response, next: NextFunction) => {
  const { error } = updateCardSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    if (!Joi.string().uuid().validate(uuid).error) {
      next();
    } else {
      res.status(400).json({ error: `Invalid ${paramName} format` });
    }
  };
};

export const validateSearchQuery = (req: Request, res: Response, next: NextFunction) => {
  const query = req.query.q;
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
  }
  next();
};