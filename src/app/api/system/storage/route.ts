import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    let totalSize = 0;
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await stat(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error(`Error getting directory size for ${dirPath}:`, error);
    return 0;
  }
}

async function getDatabaseInfo() {
  try {
    const dbPath = path.join(process.cwd(), 'carddb.sqlite');
    const stats = await stat(dbPath);
    return {
      size: stats.size,
      lastModified: stats.mtime,
      exists: true
    };
  } catch (error) {
    return {
      size: 0,
      lastModified: null,
      exists: false
    };
  }
}

async function getUploadDirectoryInfo() {
  try {
    const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
    const size = await getDirectorySize(uploadsPath);
    const items = await readdir(uploadsPath);
    
    return {
      size,
      fileCount: items.filter(item => !item.startsWith('.')).length,
      path: uploadsPath
    };
  } catch (error) {
    return {
      size: 0,
      fileCount: 0,
      path: path.join(process.cwd(), 'public', 'uploads')
    };
  }
}

async function getDiskSpace() {
  try {
    const { execSync } = require('child_process');
    const platform = process.platform;
    
    if (platform === 'darwin' || platform === 'linux') {
      // Use df command for Unix-like systems
      const output = execSync('df -h .', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      return {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        usePercentage: parseInt(parts[4].replace('%', ''))
      };
    } else if (platform === 'win32') {
      // Use PowerShell for Windows
      const output = execSync('powershell "Get-PSDrive C | Select-Object Used,Free,@{Name=\\"Size\\";Expression={$_.Used+$_.Free}}"', { encoding: 'utf8' });
      // Parse Windows output (simplified)
      return {
        total: 'N/A',
        used: 'N/A', 
        available: 'N/A',
        usePercentage: 0
      };
    }
    
    return {
      total: 'Unknown',
      used: 'Unknown',
      available: 'Unknown', 
      usePercentage: 0
    };
  } catch (error) {
    console.error('Error getting disk space:', error);
    return {
      total: 'Error',
      used: 'Error',
      available: 'Error',
      usePercentage: 0
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is global admin
    if (session.user.role !== 'global_admin') {
      return NextResponse.json({ error: 'Access denied. Global admin privileges required.' }, { status: 403 });
    }

    // Gather all storage metrics
    const [databaseInfo, uploadsInfo, diskSpace] = await Promise.all([
      getDatabaseInfo(),
      getUploadDirectoryInfo(),
      getDiskSpace()
    ]);

    const totalApplicationSize = databaseInfo.size + uploadsInfo.size;

    const metrics = {
      database: {
        ...databaseInfo,
        sizeFormatted: formatBytes(databaseInfo.size)
      },
      uploads: {
        ...uploadsInfo,
        sizeFormatted: formatBytes(uploadsInfo.size)
      },
      application: {
        totalSize: totalApplicationSize,
        totalSizeFormatted: formatBytes(totalApplicationSize)
      },
      system: {
        ...diskSpace,
        platform: process.platform,
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Storage API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve storage information' },
      { status: 500 }
    );
  }
}