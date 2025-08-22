import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CardService } from '@/lib/cardService';
import { TenantAwareCardService } from '@/lib/tenant-aware-card-service';
import { withTenantContext } from '@/lib/tenant-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return withTenantContext(request, async (tenantResult) => {
    let effectiveTenantContext = tenantResult.tenantContext;
    if (!effectiveTenantContext && tenantResult.isMultiTenant) {
      // Use the user's tenant instead of defaulting to default organization
      effectiveTenantContext = {
        tenantId: session.user.tenant_id!,
        tenantSlug: session.user.tenant_slug!,
        tenantName: session.user.tenant_name!
      };
    }

    const cardService = new TenantAwareCardService(effectiveTenantContext || undefined);
    try {
      const { id } = await params;
      const manufacturerData = await request.json();
      
      const success = await cardService.updateManufacturer(id, manufacturerData);
      
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ error: 'Failed to update manufacturer' }, { status: 400 });
      }
    } catch (error) {
      console.error('Error updating manufacturer:', error);
      return NextResponse.json({ error: 'Failed to update manufacturer' }, { status: 500 });
    } finally {
      cardService.close();
    }
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cardService = new CardService();
  try {
    const { id } = await params;
    await cardService.deleteManufacturer(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete manufacturer' }, { status: 500 });
  } finally {
    cardService.close();
  }
}