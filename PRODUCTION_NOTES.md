# QR Code Bridge System - Production Deployment Notes

## ⚠️ DNS REQUIREMENT FOR PRODUCTION

**CRITICAL**: The QR Code Bridge System requires a DNS name in production, NOT an IP address. 

📖 **See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for complete deployment instructions**

## Linux Production Compatibility: ✅ COMPATIBLE

The QR Code Bridge System is fully compatible with Linux production systems but requires these configurations:

## Required Environment Variables

```bash
# .env.local (production)
NEXTAUTH_URL=https://yourdomain.com
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=cardvault_production
POSTGRES_USER=cardvault_user
POSTGRES_PASSWORD=your-secure-password
ENABLE_MULTI_TENANT=true
```

## Production Upgrades Recommended

### 1. Session Storage (High Priority)
**Current**: In-memory Map (development only)
**Upgrade**: Redis or PostgreSQL storage

```sql
-- Add to schema_postgresql.sql
CREATE TABLE mobile_upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX idx_mobile_sessions_session_id ON mobile_upload_sessions(session_id);
CREATE INDEX idx_mobile_sessions_expires ON mobile_upload_sessions(expires_at);
```

### 2. File Storage (Medium Priority)
**Current**: Local filesystem (`public/uploads/`)
**Production Options**:
- Keep local with proper permissions: `chmod 755 public/uploads`
- Upgrade to cloud storage (AWS S3, Digital Ocean Spaces)
- Use CDN for image delivery

### 3. Security Enhancements
- Enable HTTPS for QR code URLs
- Set secure session timeouts
- Implement rate limiting on upload endpoints
- Add file virus scanning for uploads

## Linux-Specific Requirements

### File Permissions
```bash
# Ensure upload directory permissions
sudo mkdir -p /path/to/cardvault/public/uploads
sudo chown -R www-data:www-data /path/to/cardvault/public/uploads
sudo chmod 755 /path/to/cardvault/public/uploads
```

### Process Management
```bash
# Use PM2 or similar for production process management
npm install -g pm2
pm2 start npm --name "cardvault" -- run start
pm2 save
pm2 startup
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Handle uploads with larger file sizes
    client_max_body_size 10M;
}
```

## Testing Checklist for Production

- [ ] QR codes generate with correct production URLs
- [ ] Mobile upload page loads over HTTPS
- [ ] Camera permissions work on mobile browsers
- [ ] File uploads complete successfully
- [ ] Sessions persist across server operations
- [ ] Expired sessions are cleaned up properly
- [ ] Multi-tenant isolation is maintained
- [ ] Image permissions are correct on Linux filesystem

## Performance Considerations

- **Concurrent Users**: In-memory sessions limit scaling
- **File Storage**: Local storage may need cleanup jobs
- **QR Generation**: Consider caching frequently-used QR codes
- **Mobile Polling**: Implement WebSocket upgrade for real-time updates

---

**Current Status**: Development-ready, Production deployment requires session storage upgrade
**Linux Compatibility**: ✅ Full compatibility with configuration changes
**Scaling**: Requires Redis/PostgreSQL session storage for multi-instance deployment