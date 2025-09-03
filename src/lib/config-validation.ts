// Configuration validation for production deployment
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required for production');
  }

  if (!process.env.NEXTAUTH_URL) {
    errors.push('NEXTAUTH_URL is required for production (must be a DNS name like https://cardvault.yourdomain.com)');
  } else {
    // Validate NEXTAUTH_URL format for production
    const url = process.env.NEXTAUTH_URL;
    
    // Check if it's a proper DNS name (not localhost or IP)
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      errors.push('NEXTAUTH_URL cannot use localhost in production. Use a DNS name like https://cardvault.yourdomain.com');
    }
    
    // Check for IP addresses (basic check)
    const ipRegex = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
    if (ipRegex.test(url)) {
      errors.push('NEXTAUTH_URL should use a DNS name in production, not an IP address. Example: https://cardvault.yourdomain.com');
    }
    
    // Check protocol
    if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
      warnings.push('NEXTAUTH_URL should use HTTPS in production for security');
    }
    
    // Check for trailing slash
    if (url.endsWith('/')) {
      warnings.push('NEXTAUTH_URL should not end with a trailing slash');
    }
  }

  // Check database configuration
  if (!process.env.POSTGRES_HOST) {
    errors.push('POSTGRES_HOST is required for production');
  }
  
  if (!process.env.POSTGRES_DB) {
    errors.push('POSTGRES_DB is required for production');
  }
  
  if (!process.env.POSTGRES_USER) {
    errors.push('POSTGRES_USER is required for production');
  }
  
  if (!process.env.POSTGRES_PASSWORD) {
    errors.push('POSTGRES_PASSWORD is required for production');
  }

  // Check multi-tenant flag
  if (process.env.ENABLE_MULTI_TENANT !== 'true') {
    warnings.push('ENABLE_MULTI_TENANT should be set to "true" for multi-tenant deployments');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDevelopmentConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Development is more lenient
  if (!process.env.NEXTAUTH_SECRET) {
    warnings.push('NEXTAUTH_SECRET should be set for development');
  }

  // NEXTAUTH_URL is optional in development, can use IP addresses
  if (process.env.NEXTAUTH_URL) {
    const url = process.env.NEXTAUTH_URL;
    if (url.endsWith('/')) {
      warnings.push('NEXTAUTH_URL should not end with a trailing slash');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getConfigValidation(): ConfigValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return validateProductionConfig();
  } else {
    return validateDevelopmentConfig();
  }
}