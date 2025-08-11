// Input validation utilities for security

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationResult {
  public isValid: boolean;
  public errors: ValidationError[];

  constructor() {
    this.isValid = true;
    this.errors = [];
  }

  addError(field: string, message: string) {
    this.isValid = false;
    this.errors.push({ field, message });
  }
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  const result = new ValidationResult();
  
  if (password.length < 8) {
    result.addError('password', 'Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    result.addError('password', 'Password must be less than 128 characters');
  }
  if (!/(?=.*[a-z])/.test(password)) {
    result.addError('password', 'Password must contain at least one lowercase letter');
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    result.addError('password', 'Password must contain at least one uppercase letter');
  }
  if (!/(?=.*\d)/.test(password)) {
    result.addError('password', 'Password must contain at least one number');
  }
  
  return result;
}

// Username validation
export function validateUsername(username: string): ValidationResult {
  const result = new ValidationResult();
  
  if (!username || username.length < 3) {
    result.addError('username', 'Username must be at least 3 characters long');
  }
  if (username.length > 50) {
    result.addError('username', 'Username must be less than 50 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    result.addError('username', 'Username can only contain letters, numbers, hyphens, and underscores');
  }
  
  return result;
}

// Text field validation
export function validateText(text: string, fieldName: string, maxLength: number = 255): ValidationResult {
  const result = new ValidationResult();
  
  if (text && text.length > maxLength) {
    result.addError(fieldName, `${fieldName} must be less than ${maxLength} characters`);
  }
  
  // Basic XSS prevention - reject strings with script tags or javascript: protocol
  if (text && (/<script/i.test(text) || /javascript:/i.test(text))) {
    result.addError(fieldName, `${fieldName} contains invalid content`);
  }
  
  return result;
}

// Number validation
export function validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationResult {
  const result = new ValidationResult();
  
  if (value !== null && value !== undefined) {
    const num = Number(value);
    if (isNaN(num)) {
      result.addError(fieldName, `${fieldName} must be a valid number`);
    } else {
      if (min !== undefined && num < min) {
        result.addError(fieldName, `${fieldName} must be at least ${min}`);
      }
      if (max !== undefined && num > max) {
        result.addError(fieldName, `${fieldName} must be at most ${max}`);
      }
    }
  }
  
  return result;
}

// Card validation
export function validateCard(card: any): ValidationResult {
  const result = new ValidationResult();
  
  // Validate required fields
  if (!card.card_number) {
    result.addError('card_number', 'Card number is required');
  } else {
    const cardNumResult = validateText(card.card_number, 'Card number', 50);
    if (!cardNumResult.isValid) {
      result.errors.push(...cardNumResult.errors);
      result.isValid = false;
    }
  }
  
  // Validate year
  if (card.year) {
    const yearResult = validateNumber(card.year, 'Year', 1800, new Date().getFullYear() + 1);
    if (!yearResult.isValid) {
      result.errors.push(...yearResult.errors);
      result.isValid = false;
    }
  }
  
  // Validate condition
  if (card.condition) {
    const validConditions = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent', 'Near Mint', 'Mint'];
    if (!validConditions.includes(card.condition)) {
      result.addError('condition', 'Invalid card condition');
    }
  }
  
  // Validate notes length
  if (card.notes) {
    const notesResult = validateText(card.notes, 'Notes', 1000);
    if (!notesResult.isValid) {
      result.errors.push(...notesResult.errors);
      result.isValid = false;
    }
  }
  
  // Validate IDs are positive integers
  ['manufacturer_id', 'player_id', 'team_id'].forEach(field => {
    if (card[field]) {
      const idResult = validateNumber(card[field], field.replace('_', ' '), 1);
      if (!idResult.isValid) {
        result.errors.push(...idResult.errors);
        result.isValid = false;
      }
    }
  });
  
  return result;
}

// User validation
export function validateUser(user: any): ValidationResult {
  const result = new ValidationResult();
  
  // Validate username
  const usernameResult = validateUsername(user.username);
  if (!usernameResult.isValid) {
    result.errors.push(...usernameResult.errors);
    result.isValid = false;
  }
  
  // Validate email
  if (!user.email || !validateEmail(user.email)) {
    result.addError('email', 'Valid email address is required');
  }
  
  // Validate names
  ['firstname', 'lastname'].forEach(field => {
    if (user[field]) {
      const nameResult = validateText(user[field], field, 100);
      if (!nameResult.isValid) {
        result.errors.push(...nameResult.errors);
        result.isValid = false;
      }
    }
  });
  
  // Validate role
  const validRoles = ['admin', 'manager', 'user'];
  if (user.role && !validRoles.includes(user.role)) {
    result.addError('role', 'Invalid user role');
  }
  
  return result;
}

// Sanitize HTML content (basic)
export function sanitizeHtml(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Rate limiting helper
export function createRateLimitKey(identifier: string, action: string): string {
  return `ratelimit:${identifier}:${action}`;
}