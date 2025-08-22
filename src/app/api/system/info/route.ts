import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageGlobalSystem } from '@/lib/auth';
import { GlobalRole } from '@/lib/types';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import DatabaseFactory from '@/lib/database-factory';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const globalRole = session?.user?.global_role as GlobalRole;
    
    if (!session || !canManageGlobalSystem(globalRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get version from package.json
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version || '1.0.0';

    // Get install date
    let installDate = null;
    try {
      const installDatePath = join(process.cwd(), '.install_date');
      installDate = readFileSync(installDatePath, 'utf8').trim();
    } catch {
      installDate = 'Unknown';
    }

    // Get upgrade date
    let upgradeDate = null;
    try {
      const upgradeDatePath = join(process.cwd(), '.upgrade_date');
      upgradeDate = readFileSync(upgradeDatePath, 'utf8').trim();
    } catch {
      upgradeDate = null;
    }

    // Get database configuration and status
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    const databaseMode = isMultiTenant ? 'PostgreSQL Multi-Tenant' : 'SQLite Legacy';
    const environment = process.env.NODE_ENV || 'development';
    
    // Test database connection
    let connectionStatus = 'Unknown';
    let connectionError = null;
    try {
      const connectionTest = await DatabaseFactory.testConnection();
      connectionStatus = connectionTest ? 'Connected' : 'Disconnected';
    } catch (error) {
      connectionStatus = 'Error';
      connectionError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Get database-specific information
    let databaseDetails = {};
    
    if (isMultiTenant) {
      // PostgreSQL information
      try {
        const db = DatabaseFactory.getInstance();
        const tenants = await db.all('SELECT COUNT(*) as count FROM tenants') as any[];
        const totalCards = await db.all('SELECT COUNT(*) as count FROM cards') as any[];
        const totalUsers = await db.all('SELECT COUNT(*) as count FROM users') as any[];
        
        databaseDetails = {
          type: 'PostgreSQL',
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || '5432',
          database: process.env.POSTGRES_DB || 'unknown',
          tenantCount: tenants[0]?.count || 0,
          totalCards: totalCards[0]?.count || 0,
          totalUsers: totalUsers[0]?.count || 0,
          connectionPool: 'Enabled',
          features: ['Multi-Tenant', 'UUID Primary Keys', 'Row Level Security Ready']
        };
      } catch (error) {
        databaseDetails = {
          type: 'PostgreSQL',
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || '5432',
          database: process.env.POSTGRES_DB || 'unknown',
          error: error instanceof Error ? error.message : 'Query failed'
        };
      }
    } else {
      // SQLite information
      let sqliteInfo = { exists: false, size: '0B', modified: 'Unknown', path: '' };
      try {
        const dbPath = join(process.cwd(), 'carddb.sqlite');
        const stats = statSync(dbPath);
        sqliteInfo = {
          exists: true,
          size: formatFileSize(stats.size),
          modified: stats.mtime.toISOString(),
          path: dbPath
        };

        // Get SQLite data counts if connected
        if (connectionStatus === 'Connected') {
          const db = DatabaseFactory.getInstance();
          const totalCards = await db.all('SELECT COUNT(*) as count FROM cards') as any[];
          const totalUsers = await db.all('SELECT COUNT(*) as count FROM users') as any[];
          
          databaseDetails = {
            type: 'SQLite',
            file: sqliteInfo,
            totalCards: totalCards[0]?.count || 0,
            totalUsers: totalUsers[0]?.count || 0,
            features: ['Single Tenant', 'Auto-increment IDs', 'File-based Storage']
          };
        } else {
          databaseDetails = {
            type: 'SQLite',
            file: sqliteInfo,
            features: ['Single Tenant', 'Auto-increment IDs', 'File-based Storage']
          };
        }
      } catch (error) {
        databaseDetails = {
          type: 'SQLite',
          file: { exists: false, error: 'Cannot access database file' },
          features: ['Single Tenant', 'Auto-increment IDs', 'File-based Storage']
        };
      }
    }

    // Get image info
    let imageInfo = { count: 0, size: '0B' };
    try {
      const uploadsPath = join(process.cwd(), 'public/uploads');
      const files = readdirSync(uploadsPath);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );
      
      let totalSize = 0;
      imageFiles.forEach(file => {
        try {
          const filePath = join(uploadsPath, file);
          const stats = statSync(filePath);
          totalSize += stats.size;
        } catch {
          // Skip files that can't be read
        }
      });

      imageInfo = {
        count: imageFiles.length,
        size: formatFileSize(totalSize)
      };
    } catch {
      // Uploads directory doesn't exist
    }

    // Check server status (look for both dev and production processes)
    let serverStatus: { running: boolean; pid: string | null } = { running: false, pid: null };
    
    try {
      // Use safer process checking approach
      const checkProcess = (processName: string): Promise<{ running: boolean; pid: string | null }> => {
        return new Promise((resolve) => {
          const ps = spawn('ps', ['aux'], { stdio: ['ignore', 'pipe', 'ignore'] });
          const grep1 = spawn('grep', [processName], { stdio: [ps.stdout, 'pipe', 'ignore'] });
          const grep2 = spawn('grep', ['-v', 'grep'], { stdio: [grep1.stdout, 'pipe', 'ignore'] });
          
          let output = '';
          grep2.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          grep2.on('close', (code) => {
            if (code === 0 && output.trim()) {
              const pid = output.trim().split(/\s+/)[1] || null;
              resolve({ running: true, pid });
            } else {
              resolve({ running: false, pid: null });
            }
          });
          
          // Cleanup on error
          ps.on('error', () => resolve({ running: false, pid: null }));
          grep1.on('error', () => resolve({ running: false, pid: null }));
          grep2.on('error', () => resolve({ running: false, pid: null }));
        });
      };

      // Check for dev server first
      serverStatus = await checkProcess('next dev');
      
      // If dev server not found, check for production server
      if (!serverStatus.running) {
        serverStatus = await checkProcess('next start');
      }
    } catch (error) {
      console.error('Error checking server status:', error);
      serverStatus = { running: false, pid: null };
    }

    return NextResponse.json({
      version,
      installDate,
      upgradeDate,
      environment,
      database: {
        mode: databaseMode,
        status: connectionStatus,
        error: connectionError,
        details: databaseDetails,
        isMultiTenant
      },
      images: imageInfo,
      server: serverStatus
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    return NextResponse.json(
      { error: 'Failed to get system information' },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}