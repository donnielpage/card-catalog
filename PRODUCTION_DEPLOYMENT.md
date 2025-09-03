# CardVault Production Deployment Guide

## ⚠️ **DNS Requirement for Mobile QR Code Bridge**

**CRITICAL**: CardVault's QR Code Bridge System for mobile image uploads requires a proper DNS name in production. IP addresses will NOT work for mobile devices scanning QR codes.

## Prerequisites

### 1. DNS Configuration (REQUIRED)
- **Purchase/configure a domain**: `yourdomain.com`
- **Set up DNS A record**: Point to your server's public IP
- **Examples**:
  - `cardvault.yourdomain.com`
  - `cards.company.com` 
  - `inventory.baseball-cards.org`

### 2. SSL Certificate (STRONGLY RECOMMENDED)
- **Let's Encrypt** (free): Use Certbot
- **Commercial SSL**: From your domain provider
- **Cloudflare**: Free SSL proxy option

### 3. Server Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Node.js**: v18+ or v20+
- **PostgreSQL**: v13+
- **Memory**: 2GB minimum, 4GB recommended
- **Storage**: 10GB minimum (more for card images)

## Quick Production Setup

### Step 1: DNS and SSL Setup
```bash
# Example with nginx and Let's Encrypt
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d cardvault.yourdomain.com

# Verify certificate renewal
sudo certbot renew --dry-run
```

### Step 2: Application Setup
```bash
# Clone repository
git clone https://github.com/yourorg/cardvault.git
cd cardvault

# Install dependencies
npm install

# Copy production environment template
cp .env.production.example .env.local

# Edit configuration (CRITICAL STEP)
nano .env.local
```

### Step 3: Configure Environment (.env.local)
```bash
# Authentication Configuration (REQUIRED)
NEXTAUTH_SECRET=your-very-secure-random-secret-here

# DNS Configuration (REQUIRED for QR Code Mobile Bridge)
# MUST be your actual DNS name - NO IP addresses!
NEXTAUTH_URL=https://cardvault.yourdomain.com

# PostgreSQL connection
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cardvault_production
POSTGRES_USER=cardvault
POSTGRES_PASSWORD=your-secure-database-password

# Feature flags
ENABLE_MULTI_TENANT=true
NODE_ENV=production
```

### Step 4: Database Setup
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE cardvault_production;
CREATE USER cardvault WITH ENCRYPTED PASSWORD 'your-secure-database-password';
GRANT ALL PRIVILEGES ON DATABASE cardvault_production TO cardvault;
ALTER USER cardvault CREATEDB;
EOF

# Run schema setup
npm run db:setup
```

### Step 5: Build and Deploy
```bash
# Build application
npm run build

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start npm --name "cardvault" -- run start
pm2 save
pm2 startup

# Configure auto-start on boot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
```

### Step 6: Nginx Configuration
```nginx
# /etc/nginx/sites-available/cardvault
server {
    listen 80;
    server_name cardvault.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cardvault.yourdomain.com;
    
    # SSL configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/cardvault.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cardvault.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # File upload size limit (for card images)
    client_max_body_size 10M;
    
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
        
        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

```bash
# Enable site and reload nginx
sudo ln -s /etc/nginx/sites-available/cardvault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration Validation

CardVault includes built-in configuration validation. Check your setup:

```bash
# Start the application and check logs
pm2 logs cardvault

# Look for configuration warnings:
# ✓ "Production configuration validated successfully"
# ⚠️ "Production deployment missing NEXTAUTH_URL!"
```

## QR Code Mobile Bridge Requirements

### Development vs Production
- **Development**: IP addresses work (`http://192.168.1.100:3000`)
- **Production**: DNS names REQUIRED (`https://cardvault.yourdomain.com`)

### Why DNS is Required
1. **Mobile Security**: Modern browsers require secure contexts for camera access
2. **SSL Certificates**: Cannot be issued for IP addresses
3. **Cross-Network Access**: DNS names work across different networks
4. **Professional Deployment**: Domain names provide consistent access

### Testing QR Code Functionality
1. **Generate QR Code**: Use "📱 Mobile Upload" in any card form
2. **Verify URL**: QR code should contain `https://cardvault.yourdomain.com/mobile-upload/...`
3. **Test Mobile Access**: Scan with phone - should open mobile upload page
4. **Test Upload**: Take photo or select image - should appear in desktop form

## Troubleshooting

### QR Codes Not Working on Mobile
```bash
# Check NEXTAUTH_URL configuration
echo $NEXTAUTH_URL
# Should output: https://cardvault.yourdomain.com (NOT localhost or IP)

# Check DNS resolution
nslookup cardvault.yourdomain.com
# Should resolve to your server's IP

# Check SSL certificate
curl -I https://cardvault.yourdomain.com
# Should return 200 OK with SSL
```

### Application Won't Start
```bash
# Check logs
pm2 logs cardvault

# Common issues:
# - Database connection failed
# - Missing environment variables
# - Port already in use
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -c "SELECT version();"

# Check user permissions
sudo -u postgres psql -c "\\du"
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Database Security**: Use strong passwords, enable SSL
3. **Firewall**: Only expose ports 80, 443, and 22 (SSH)
4. **Updates**: Keep system and dependencies updated
5. **Backups**: Regular database and file backups
6. **Monitoring**: Set up log monitoring and alerts

## DNS Provider Examples

### Cloudflare (Recommended)
1. Point domain to Cloudflare nameservers
2. Add A record: `cardvault` → Your server IP
3. Enable "Proxy status" for DDoS protection
4. SSL mode: "Full (Strict)"

### AWS Route 53
1. Create hosted zone for your domain
2. Add A record pointing to server IP
3. Update domain nameservers

### Other Providers (Namecheap, GoDaddy, etc.)
1. Access DNS management
2. Add A record: `cardvault` → Server IP
3. Wait for propagation (up to 48 hours)

---

## Summary Checklist

- [ ] Domain name purchased and configured
- [ ] DNS A record pointing to server
- [ ] SSL certificate installed
- [ ] `.env.local` configured with DNS name
- [ ] PostgreSQL database created
- [ ] Application built and deployed
- [ ] Nginx configured and running
- [ ] QR code mobile bridge tested
- [ ] All services auto-start on boot

**Remember**: The QR Code Bridge System requires a proper DNS name. IP addresses will not work for mobile device access in production!