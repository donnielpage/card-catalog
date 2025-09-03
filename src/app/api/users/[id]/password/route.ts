import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Users can only change their own password, unless they're admin
  if (session.user.id !== id && session.user.role !== 'admin' && session.user.organization_role !== 'org_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    // Create tenant context from user session
    const tenantContext = session.user.tenant_id ? {
      tenantId: session.user.tenant_id,
      tenantSlug: session.user.tenant_slug!,
      tenantName: session.user.tenant_name!
    } : undefined;
    
    const cardService = new TenantAwareCardService(tenantContext);
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';

    // Get current user data to verify current password
    const currentUser = await cardService.db.get(
      isMultiTenant 
        ? 'SELECT id, username, password_hash FROM users WHERE id = $1'
        : 'SELECT id, username, password_hash FROM users WHERE id = ?',
      [isMultiTenant ? id : parseInt(id)]
    );

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password_hash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await cardService.db.run(
      isMultiTenant
        ? 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2'
        : 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, isMultiTenant ? id : parseInt(id)]
    );

    return NextResponse.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}