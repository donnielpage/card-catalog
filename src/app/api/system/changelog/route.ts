import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageGlobalSystem } from '@/lib/auth';
import { GlobalRole } from '@/lib/types';
import { getLatestChangelog, getChangelogByVersion, getChangesSince } from '@/lib/changelog';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const globalRole = session?.user?.global_role as GlobalRole;
    
    if (!session || !canManageGlobalSystem(globalRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');
    const since = searchParams.get('since');
    const limit = searchParams.get('limit');

    let changelog;

    if (version) {
      // Get specific version
      changelog = getChangelogByVersion(version);
      if (!changelog) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      }
    } else if (since) {
      // Get changes since a specific version
      changelog = getChangesSince(since);
    } else {
      // Get latest entries
      const entryLimit = limit ? parseInt(limit) : 5;
      changelog = getLatestChangelog(entryLimit);
    }

    return NextResponse.json({
      changelog: Array.isArray(changelog) ? changelog : [changelog]
    });
  } catch (error) {
    console.error('Error fetching changelog:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    );
  }
}