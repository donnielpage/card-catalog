import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupDir = join(process.cwd(), 'backups');
    
    if (!existsSync(backupDir)) {
      return NextResponse.json({
        database: [],
        images: [],
        system: []
      });
    }

    const files = readdirSync(backupDir);
    const backups = {
      database: [] as BackupFile[],
      images: [] as BackupFile[],
      system: [] as BackupFile[]
    };

    files.forEach(file => {
      try {
        const filePath = join(backupDir, file);
        const stats = statSync(filePath);
        
        const backupFile: BackupFile = {
          filename: file,
          size: formatFileSize(stats.size),
          created: stats.mtime.toISOString()
        };

        if (file.includes('carddb-backup')) {
          backups.database.push(backupFile);
        } else if (file.includes('images-backup')) {
          backups.images.push(backupFile);
        } else if (file.includes('system-backup')) {
          backups.system.push(backupFile);
        }
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Could not read backup file: ${file}`);
      }
    });

    // Sort by creation date (newest first)
    Object.keys(backups).forEach(key => {
      backups[key as keyof typeof backups].sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    });

    return NextResponse.json(backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

interface BackupFile {
  filename: string;
  size: string;
  created: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}