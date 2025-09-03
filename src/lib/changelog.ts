// Changelog and release notes for CardVault

export interface ChangelogEntry {
  version: string;
  releaseDate: string;
  type: 'major' | 'minor' | 'patch';
  title: string;
  description: string;
  changes: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
    security?: string[];
    removed?: string[];
  };
  breaking?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.0.0',
    releaseDate: '2025-09-03',
    type: 'major',
    title: 'Complete Microservices Transformation',
    description: 'Revolutionary architectural transformation from monolithic to comprehensive microservices ecosystem with Phase VI Card Service implementation.',
    changes: {
      added: [
        'Phase VI Card Service - Complete card management microservice (port 3006)',
        'Multi-tenant card operations with Row Level Security policies',
        'Cross-service validation with Reference Service integration',
        'Advanced card search capabilities across all fields and related data',
        'Card statistics generation with year distribution, grade analysis, top players/manufacturers',
        'Complete microservices architecture: Media (3001), Reference (3002), User (3003), System (3004), Tenant (3005), Card (3006)',
        'Docker Compose orchestration for full stack deployment',
        'nginx API Gateway with intelligent routing to microservices',
        'PostgreSQL database with multi-tenant Row Level Security',
        'Redis caching layer for improved performance',
        'Health monitoring endpoints across all services',
        'Service-to-service authentication with JWT tokens',
        'Comprehensive logging with Winston across all services',
        'Input validation with Joi schemas for all services',
        'Rate limiting and security headers in API Gateway'
      ],
      changed: [
        'Architecture: Complete transformation from monolithic to microservices',
        'Database: Enhanced multi-tenant schema with RLS policies',
        'API Endpoints: Card operations now routed through dedicated Card Service',
        'Authentication: Centralized JWT authentication across all services',
        'Deployment: Full containerization with Docker Compose',
        'Performance: Independent scaling capability for each service',
        'Security: Enhanced with service-to-service authentication'
      ],
      security: [
        'Multi-tenant Row Level Security policies for data isolation',
        'Service-to-service authentication tokens',
        'Enhanced input validation across all microservices',
        'CORS configuration for cross-origin requests',
        'Rate limiting in API Gateway to prevent abuse'
      ]
    },
    breaking: [
      'Monolithic architecture replaced with microservices architecture',
      'Card API endpoints now routed through API Gateway (/api/cards)',
      'Enhanced multi-tenant database schema requires migration',
      'Service dependencies require Docker Compose or individual service management'
    ]
  },
  {
    version: '2.0.0',
    releaseDate: '2025-08-09',
    type: 'major',
    title: 'Enhanced Security & System Management',
    description: 'Major security overhaul with comprehensive system management tools and breaking changes for improved security.',
    changes: {
      added: [
        'Interactive admin password setup during installation',
        'Web-based system management interface for administrators',
        'Comprehensive input validation system',
        'Security headers middleware (CSP, XSS protection, etc.)',
        'Database, image, and full system backup functionality',
        'Server status monitoring and system information display',
        'Version checking and update notifications',
        'Feature announcement popup system'
      ],
      security: [
        'Fixed critical command injection vulnerabilities in system endpoints',
        'Added authentication requirements to public card API endpoints',
        'Implemented path traversal prevention in file operations',
        'Enhanced session security with shorter duration (7 days) and secure cookies',
        'Removed sensitive data from server logs',
        'Strong password requirements with bcrypt hashing (12 rounds)',
        'Production environment validation for secrets'
      ],
      changed: [
        'Logout redirects now use current host instead of localhost',
        'Updated branding from "Card Catalog" to "CardVault" throughout app',
        'Session duration reduced from 30 days to 7 days for security',
        'Improved environment configuration for production deployments'
      ],
      removed: [
        'Default admin credentials removed from documentation',
        'Sensitive information removed from console logs'
      ],
      fixed: [
        'NextAuth configuration for proper host handling',
        'TypeScript build errors for production compatibility',
        'Server status detection for both development and production'
      ]
    },
    breaking: [
      'Default admin credentials (admin/password123) removed - custom password required during installation',
      'Card API endpoints now require authentication',
      'NEXTAUTH_SECRET must be set in production environment'
    ]
  },
  {
    version: '1.1.0',
    releaseDate: '2025-08-08',
    type: 'minor',
    title: 'System Management Interface',
    description: 'Added web-based system management tools for administrators.',
    changes: {
      added: [
        'System Management interface accessible from admin navigation',
        'Real-time system information display',
        'Backup creation functionality from web interface',
        'System metrics and server status monitoring',
        'Version tracking and upgrade system',
        'Footer with version and install date information'
      ],
      changed: [
        'Enhanced navigation with system management access for admins',
        'Improved upgrade process with backup recommendations'
      ]
    }
  },
  {
    version: '1.0.0',
    releaseDate: '2025-08-07',
    type: 'major',
    title: 'Initial Release',
    description: 'First stable release of CardVault with core functionality.',
    changes: {
      added: [
        'Complete card collection management system',
        'User authentication and role-based access control',
        'All 30 MLB teams with official colors and dynamic theming',
        'Advanced filtering and search capabilities',
        'Image upload and management for cards',
        'Comprehensive reporting and statistics',
        'User profile management with favorite teams and players',
        'Database schema with full CRUD operations',
        'Responsive web interface built with Next.js and Tailwind CSS'
      ]
    }
  }
];

export function getLatestChangelog(limit: number = 5): ChangelogEntry[] {
  return CHANGELOG.slice(0, limit);
}

export function getChangelogByVersion(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find(entry => entry.version === version);
}

export function getChangesSince(version: string): ChangelogEntry[] {
  const index = CHANGELOG.findIndex(entry => entry.version === version);
  return index === -1 ? CHANGELOG : CHANGELOG.slice(0, index);
}