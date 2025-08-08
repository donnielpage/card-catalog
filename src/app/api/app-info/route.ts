import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

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

    return NextResponse.json({
      version,
      installDate
    });
  } catch (error) {
    console.error('Error reading app info:', error);
    return NextResponse.json(
      { version: '1.0.0', installDate: null },
      { status: 200 } // Still return 200 with defaults
    );
  }
}