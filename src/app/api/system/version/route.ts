import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageGlobalSystem } from '@/lib/auth';
import { GlobalRole } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const globalRole = session?.user?.global_role as GlobalRole;
    
    if (!session || !canManageGlobalSystem(globalRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current version
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version || '1.0.0';

    // Check for latest version from GitHub
    const githubRepo = 'donnielpage/card-catalog';
    const githubAPI = `https://api.github.com/repos/${githubRepo}`;
    
    let latestVersion = null;
    let updateAvailable = false;
    let error = null;

    try {
      // Try to get latest release
      const releaseResponse = await fetch(`${githubAPI}/releases/latest`);
      if (releaseResponse.ok) {
        const releaseData = await releaseResponse.json();
        latestVersion = releaseData.tag_name?.replace(/^v/, '') || null;
      }

      // If no release found, try to get version from main branch package.json
      if (!latestVersion) {
        const contentsResponse = await fetch(`${githubAPI}/contents/package.json`);
        if (contentsResponse.ok) {
          const contentsData = await contentsResponse.json();
          const packageContent = Buffer.from(contentsData.content, 'base64').toString();
          const remotePackageJson = JSON.parse(packageContent);
          latestVersion = remotePackageJson.version;
        }
      }

      if (latestVersion) {
        updateAvailable = compareVersions(currentVersion, latestVersion) < 0;
      }
    } catch (err) {
      error = 'Failed to check for updates. Please check your internet connection.';
      console.error('Version check error:', err);
    }

    return NextResponse.json({
      currentVersion,
      latestVersion,
      updateAvailable,
      error
    });
  } catch (error) {
    console.error('Error checking version:', error);
    return NextResponse.json(
      { error: 'Failed to check version' },
      { status: 500 }
    );
  }
}

// Simple version comparison function
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
}