import { NextResponse } from 'next/server';
import { getConfigValidation } from '@/lib/config-validation';

export async function GET() {
  try {
    const validation = getConfigValidation();
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = {
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.2.0-alpha',
      config: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      }
    };

    // Log configuration issues
    if (validation.errors.length > 0) {
      console.error('❌ Configuration Errors:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Configuration Warnings:', validation.warnings);
    }
    
    if (validation.isValid && isProduction) {
      console.log('✅ Production configuration validated successfully');
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}