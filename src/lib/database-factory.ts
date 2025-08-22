import Database from './database';
import PostgreSQLDatabase, { type TenantContext } from './database-pg';
import { 
  DatabaseInterface, 
  TenantDatabaseInterface, 
  SQLiteDatabaseAdapter, 
  PostgreSQLDatabaseAdapter,
  isTenantDatabase 
} from './database-interface';

interface DatabaseConfig {
  enableMultiTenant?: boolean;
  tenantContext?: TenantContext;
}

export class DatabaseFactory {
  private static instance: DatabaseInterface | null = null;
  private static isMultiTenant: boolean = false;

  static getInstance(config?: DatabaseConfig): DatabaseInterface {
    const enableMultiTenant = config?.enableMultiTenant ?? 
      process.env.ENABLE_MULTI_TENANT === 'true';

    // If switching modes or first initialization, create new instance
    if (!this.instance || this.isMultiTenant !== enableMultiTenant) {
      this.isMultiTenant = enableMultiTenant;
      
      if (enableMultiTenant) {
        console.log('🐘 Using PostgreSQL multi-tenant database');
        const pgDb = new PostgreSQLDatabase(undefined, config?.tenantContext);
        this.instance = new PostgreSQLDatabaseAdapter(pgDb);
      } else {
        console.log('💾 Using SQLite legacy database');
        const sqliteDb = new Database();
        this.instance = new SQLiteDatabaseAdapter(sqliteDb);
      }
    }

    // TypeScript guard - this.instance is guaranteed to exist at this point
    if (!this.instance) {
      throw new Error('Failed to initialize database instance');
    }

    // Update tenant context if using PostgreSQL
    if (this.isMultiTenant && config?.tenantContext && isTenantDatabase(this.instance)) {
      this.instance.setTenantContext?.(config.tenantContext);
    }

    return this.instance;
  }

  static async createTenantAwareInstance(tenantSlug?: string): Promise<DatabaseInterface> {
    const enableMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    if (!enableMultiTenant) {
      return this.getInstance({ enableMultiTenant: false });
    }

    // If no tenant slug provided, return basic PostgreSQL instance
    if (!tenantSlug) {
      return this.getInstance({ enableMultiTenant: true });
    }

    // Look up tenant by slug
    const tempDb = new PostgreSQLDatabase();
    try {
      const tenant = await tempDb.getTenant(tenantSlug) as { id: string; slug: string } | null;
      
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantSlug}`);
      }

      const tenantContext: TenantContext = {
        tenantId: tenant.id,
        tenantSlug: tenant.slug
      };

      await tempDb.close();
      
      return this.getInstance({ 
        enableMultiTenant: true, 
        tenantContext 
      });
    } catch (error) {
      await tempDb.close();
      throw error;
    }
  }

  static isUsingMultiTenant(): boolean {
    return this.isMultiTenant;
  }

  static async closeConnection(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const db = this.getInstance();
      
      if (db.testConnection) {
        return await db.testConnection();
      } else {
        // Fallback test
        const result = await db.get('SELECT 1 as test');
        return !!result;
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Middleware helper for Next.js API routes
export interface NextRequestWithTenant {
  headers: { get: (key: string) => string | null };
  nextUrl?: { pathname: string };
  url: string;
  tenant?: TenantContext;
  db?: DatabaseInterface;
}

export async function withDatabase(
  req: NextRequestWithTenant,
  handler: (req: NextRequestWithTenant, db: DatabaseInterface) => Promise<Response>
): Promise<Response> {
  try {
    // Extract tenant slug from hostname, path, or headers
    const tenantSlug = extractTenantSlug(req);
    
    const db = await DatabaseFactory.createTenantAwareInstance(tenantSlug);
    
    // Attach database to request for convenience
    req.db = db;
    if (tenantSlug && DatabaseFactory.isUsingMultiTenant() && isTenantDatabase(db)) {
      req.tenant = db.getTenantContext?.();
    }
    
    return await handler(req, db);
  } catch (error) {
    console.error('Database middleware error:', error);
    return new Response(
      JSON.stringify({ error: 'Database connection failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function extractTenantSlug(req: NextRequestWithTenant): string | undefined {
  // Method 1: Subdomain extraction (tenant.cardvault.com)
  const host = req.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'cardvault') {
    return subdomain;
  }

  // Method 2: Path-based routing (/tenant-slug/...)
  const pathname = req.nextUrl?.pathname || new URL(req.url).pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0 && pathSegments[0] !== 'api') {
    // Check if first segment looks like a tenant slug
    const possibleSlug = pathSegments[0];
    if (/^[a-z0-9-]+$/.test(possibleSlug) && possibleSlug.length > 2) {
      return possibleSlug;
    }
  }

  // Method 3: Header-based (for API calls)
  const tenantHeader = req.headers.get('x-tenant-slug');
  if (tenantHeader) {
    return tenantHeader;
  }

  // Method 4: Query parameter (for testing)
  const url = new URL(req.url);
  const tenantQuery = url.searchParams.get('tenant');
  if (tenantQuery) {
    return tenantQuery;
  }

  return undefined;
}

export default DatabaseFactory;