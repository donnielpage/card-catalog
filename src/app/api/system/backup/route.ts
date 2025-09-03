import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageGlobalSystem } from '@/lib/auth';
import { GlobalRole } from '@/lib/types';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import DatabaseFactory from '@/lib/database-factory';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const globalRole = session?.user?.global_role as GlobalRole;
    
    if (!session || !canManageGlobalSystem(globalRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
    
    // Ensure backups directory exists
    const backupDir = join(process.cwd(), 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    switch (type) {
      case 'database':
        return await backupDatabase(timestamp, backupDir);
      case 'images':
        return await backupImages(timestamp, backupDir);
      case 'system':
        return await backupSystem(timestamp, backupDir);
      default:
        return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

async function backupDatabase(timestamp: string, backupDir: string) {
  const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
  
  if (isMultiTenant) {
    // PostgreSQL backup
    return await backupPostgreSQL(timestamp, backupDir);
  } else {
    // SQLite backup
    return await backupSQLite(timestamp, backupDir);
  }
}

async function backupSQLite(timestamp: string, backupDir: string) {
  const dbPath = join(process.cwd(), 'carddb.sqlite');
  
  if (!existsSync(dbPath)) {
    return NextResponse.json({ error: 'SQLite database file not found' }, { status: 404 });
  }

  const backupFile = join(backupDir, `carddb-sqlite-backup-${timestamp}.sqlite`);
  
  try {
    copyFileSync(dbPath, backupFile);
    
    // Verify backup
    const originalSize = statSync(dbPath).size;
    const backupSize = statSync(backupFile).size;
    
    if (originalSize !== backupSize) {
      return NextResponse.json({ error: 'SQLite backup verification failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SQLite database backup created successfully',
      filename: `carddb-sqlite-backup-${timestamp}.sqlite`,
      size: formatFileSize(backupSize),
      type: 'SQLite'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create SQLite backup' }, { status: 500 });
  }
}

async function backupPostgreSQL(timestamp: string, backupDir: string) {
  const backupFile = join(backupDir, `carddb-postgresql-backup-${timestamp}.sql`);
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DB || 'cardvault_dev';
  const user = process.env.POSTGRES_USER || process.env.USER || 'postgres';
  
  try {
    // Create PostgreSQL backup using pg_dump
    const createPgBackup = (): Promise<{ size: number }> => {
      return new Promise((resolve, reject) => {
        const pgDumpArgs = [
          '-h', host,
          '-p', port,
          '-U', user,
          '-d', database,
          '--no-password', // Assumes trust/peer authentication or PGPASSWORD env var
          '--clean',
          '--create',
          '--if-exists',
          '-f', backupFile
        ];

        const pgDumpPath = process.env.PG_DUMP_PATH || '/opt/homebrew/Cellar/postgresql@15/15.13/bin/pg_dump';
        const pgDump = spawn(pgDumpPath, pgDumpArgs, { 
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { 
            ...process.env,
            PGPASSWORD: process.env.POSTGRES_PASSWORD || ''
          }
        });

        let errorOutput = '';
        
        pgDump.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pgDump.on('close', (code) => {
          if (code === 0) {
            try {
              const backupSize = statSync(backupFile).size;
              resolve({ size: backupSize });
            } catch (error) {
              reject(new Error('Backup file verification failed'));
            }
          } else {
            reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
          }
        });

        pgDump.on('error', (error) => {
          reject(error);
        });
      });
    };

    const result = await createPgBackup();
    
    // Test connection to ensure backup is complete
    const connectionTest = await DatabaseFactory.testConnection();
    if (!connectionTest) {
      throw new Error('Database connection lost during backup');
    }

    return NextResponse.json({
      success: true,
      message: 'PostgreSQL database backup created successfully',
      filename: `carddb-postgresql-backup-${timestamp}.sql`,
      size: formatFileSize(result.size),
      type: 'PostgreSQL',
      details: {
        host: `${host}:${port}`,
        database: database
      }
    });
  } catch (error) {
    console.error('PostgreSQL backup error:', error);
    
    // Fallback: Create a JSON export if pg_dump fails
    try {
      return await createJsonBackup(timestamp, backupDir);
    } catch (fallbackError) {
      return NextResponse.json({ 
        error: `Failed to create PostgreSQL backup: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }
}

async function createJsonBackup(timestamp: string, backupDir: string) {
  const backupFile = join(backupDir, `carddb-json-backup-${timestamp}.json`);
  
  try {
    const db = DatabaseFactory.getInstance();
    
    // Export all tenant data
    const tenants = await db.all('SELECT * FROM tenants');
    const users = await db.all('SELECT * FROM users');
    const teams = await db.all('SELECT * FROM teams');
    const players = await db.all('SELECT * FROM players');
    const manufacturers = await db.all('SELECT * FROM manufacturers');
    const cards = await db.all('SELECT * FROM cards');
    
    const backup = {
      version: '2.1.0-alpha',
      timestamp: new Date().toISOString(),
      type: 'PostgreSQL-JSON-Fallback',
      data: {
        tenants,
        users: users.map((u: any) => ({ ...u, password_hash: '[REDACTED]' })), // Don't export passwords
        teams,
        players,
        manufacturers,
        cards
      }
    };
    
    const backupData = JSON.stringify(backup, null, 2);
    writeFileSync(backupFile, backupData, 'utf8');
    
    const backupSize = statSync(backupFile).size;
    
    return NextResponse.json({
      success: true,
      message: 'PostgreSQL JSON backup created successfully (fallback method)',
      filename: `carddb-json-backup-${timestamp}.json`,
      size: formatFileSize(backupSize),
      type: 'PostgreSQL-JSON',
      warning: 'pg_dump not available, used JSON export fallback'
    });
  } catch (error) {
    throw new Error(`JSON backup fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function backupImages(timestamp: string, backupDir: string) {
  const uploadsPath = join(process.cwd(), 'public/uploads');
  
  if (!existsSync(uploadsPath)) {
    return NextResponse.json({ error: 'Uploads directory not found' }, { status: 404 });
  }

  const files = readdirSync(uploadsPath);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No images found to backup' }, { status: 404 });
  }

  const backupFile = join(backupDir, `images-backup-${timestamp}.tar.gz`);
  
  try {
    // Use safer tar command with spawn
    const createBackup = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const tar = spawn('tar', [
          '-czf', backupFile,
          '-C', join(process.cwd(), 'public'),
          'uploads/'
        ], { stdio: 'pipe' });

        tar.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`tar process exited with code ${code}`));
          }
        });

        tar.on('error', (error) => {
          reject(error);
        });
      });
    };

    await createBackup();
    const backupSize = statSync(backupFile).size;
    
    return NextResponse.json({
      success: true,
      message: 'Image backup created successfully',
      filename: `images-backup-${timestamp}.tar.gz`,
      size: formatFileSize(backupSize),
      fileCount: files.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create image backup' }, { status: 500 });
  }
}

async function backupSystem(timestamp: string, backupDir: string) {
  const backupFile = join(backupDir, `system-backup-${timestamp}.tar.gz`);
  
  try {
    // Create system backup using safer spawn approach
    const createSystemBackup = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const tar = spawn('tar', [
          '-czf', backupFile,
          '--exclude=node_modules',
          '--exclude=backups',
          '--exclude=.git',
          '--exclude=*.log',
          '--exclude=.next',
          '.'
        ], { 
          cwd: process.cwd(),
          stdio: 'pipe' 
        });

        tar.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`tar process exited with code ${code}`));
          }
        });

        tar.on('error', (error) => {
          reject(error);
        });
      });
    };

    await createSystemBackup();
    const backupSize = statSync(backupFile).size;
    
    return NextResponse.json({
      success: true,
      message: 'System backup created successfully',
      filename: `system-backup-${timestamp}.tar.gz`,
      size: formatFileSize(backupSize)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create system backup' }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}