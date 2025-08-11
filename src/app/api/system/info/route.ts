import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

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