import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
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

    // Get database info
    let databaseInfo = { exists: false, size: '0B', modified: 'Unknown' };
    try {
      const dbPath = join(process.cwd(), 'carddb.sqlite');
      const stats = statSync(dbPath);
      databaseInfo = {
        exists: true,
        size: formatFileSize(stats.size),
        modified: stats.mtime.toISOString()
      };
    } catch {
      // Database doesn't exist
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
    let serverStatus = { running: false, pid: null };
    try {
      // Check for both dev server and production server
      let processes = '';
      
      try {
        const devProcesses = execSync('ps aux | grep "next dev" | grep -v grep', { encoding: 'utf8' });
        processes = devProcesses.trim();
      } catch {
        // Dev server not running, try production
      }
      
      if (!processes) {
        try {
          const prodProcesses = execSync('ps aux | grep "next start" | grep -v grep', { encoding: 'utf8' });
          processes = prodProcesses.trim();
        } catch {
          // Production server not running either
        }
      }
      
      if (processes) {
        const pid = processes.split(/\s+/)[1];
        serverStatus = { running: true, pid };
      }
    } catch (error) {
      console.error('Error checking server status:', error);
    }

    return NextResponse.json({
      version,
      installDate,
      database: databaseInfo,
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