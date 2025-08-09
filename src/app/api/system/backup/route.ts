import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
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
  const dbPath = join(process.cwd(), 'carddb.sqlite');
  
  if (!existsSync(dbPath)) {
    return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
  }

  const backupFile = join(backupDir, `carddb-backup-${timestamp}.sqlite`);
  
  try {
    copyFileSync(dbPath, backupFile);
    
    // Verify backup
    const originalSize = statSync(dbPath).size;
    const backupSize = statSync(backupFile).size;
    
    if (originalSize !== backupSize) {
      return NextResponse.json({ error: 'Backup verification failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database backup created successfully',
      filename: `carddb-backup-${timestamp}.sqlite`,
      size: formatFileSize(backupSize)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create database backup' }, { status: 500 });
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
    // Use tar to create compressed backup
    execSync(`tar -czf "${backupFile}" -C "${join(process.cwd(), 'public')}" uploads/`, { 
      stdio: 'pipe' 
    });
    
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
    // Create system backup excluding unnecessary directories
    execSync(`tar -czf "${backupFile}" --exclude='node_modules' --exclude='backups' --exclude='.git' --exclude='*.log' --exclude='.next' .`, {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
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