import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import DatabaseFactory from '@/lib/database-factory';

export async function GET() {
  try {
    // Get version from package.json
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version || '1.0.0';

    // Get install date from .install_date file
    let installDate = null;
    try {
      const installDatePath = join(process.cwd(), '.install_date');
      installDate = readFileSync(installDatePath, 'utf8').trim();
    } catch {
      // File doesn't exist or can't be read
      installDate = null;
    }

    // Get database mode information
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    const databaseMode = isMultiTenant ? 'PostgreSQL Multi-Tenant' : 'SQLite Legacy';
    const environment = process.env.NODE_ENV || 'development';
    
    // Test database connection
    let dbStatus = 'Unknown';
    try {
      const connectionTest = await DatabaseFactory.testConnection();
      dbStatus = connectionTest ? 'Connected' : 'Disconnected';
    } catch {
      dbStatus = 'Error';
    }

    return NextResponse.json({
      version,
      installDate,
      databaseMode,
      databaseStatus: dbStatus,
      environment,
      isMultiTenant
    });
  } catch (error) {
    console.error('Error reading app info:', error);
    return NextResponse.json(
      { version: '1.0.0', installDate: null },
      { status: 200 } // Still return 200 with defaults
    );
  }
}