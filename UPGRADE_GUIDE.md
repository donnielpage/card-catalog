# CardVault Upgrade Guide

## Upgrading from SQLite to PostgreSQL Multi-Tenant

This guide helps you migrate your existing SQLite-based CardVault installation to the new PostgreSQL multi-tenant architecture.

### ⚠️ Important Notes

- **Backup First**: Always backup your existing `carddb.sqlite` file before starting
- **Downtime Required**: Plan for 1-2 hours of downtime during migration
- **Test Migration**: Test the process in a development environment first
- **Data Verification**: Verify all data after migration before going live

### Prerequisites Checklist

- [ ] PostgreSQL 15+ installed and running
- [ ] Current SQLite database backed up
- [ ] New environment variables configured
- [ ] Migration tested in development

---

## Step 1: Backup Current System

```bash
# Stop CardVault application
pm2 stop cardvault  # or however you're running it

# Backup database and uploads
cp carddb.sqlite carddb.sqlite.backup.$(date +%Y%m%d)
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz public/uploads/

# Backup environment
cp .env.local .env.local.backup
```

---

## Step 2: Install PostgreSQL

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database and User:
```bash
sudo -u postgres psql

CREATE DATABASE cardvault_production;
CREATE USER cardvault WITH PASSWORD 'your-secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE cardvault_production TO cardvault;
ALTER USER cardvault CREATEDB;  -- Needed for tenant databases
\q
```

---

## Step 3: Update Environment Configuration

Update your `.env.local` file:

```bash
# Keep existing NextAuth settings
NEXTAUTH_SECRET=your-existing-secret
NEXTAUTH_URL=https://yourdomain.com  # Update if needed

# Add PostgreSQL configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cardvault_production
POSTGRES_USER=cardvault
POSTGRES_PASSWORD=your-secure-password-here

# Enable multi-tenant mode
ENABLE_MULTI_TENANT=true

# Optional: Keep SQLite as backup during transition
BACKUP_SQLITE_PATH=./carddb.sqlite.backup
```

---

## Step 4: Update CardVault Code

```bash
# Pull the latest multi-tenant code
git fetch origin
git checkout multi-tenant-release  # or your target branch

# Install new dependencies
npm install
```

---

## Step 5: Create PostgreSQL Schema

```bash
# Create the multi-tenant schema
psql -d cardvault_production -U cardvault -f schema_postgresql.sql
```

---

## Step 6: Data Migration

### Option A: Automatic Migration Script (Recommended)

```bash
# Run the migration script
npm run migrate:sqlite-to-postgres

# Verify migration
npm run verify:migration
```

### Option B: Manual Migration

If you prefer manual control over the migration:

```bash
# Export SQLite data
sqlite3 carddb.sqlite .dump > sqlite_export.sql

# Convert and import to PostgreSQL (script provided)
node scripts/migrate-sqlite-to-postgres.js
```

### Migration Script Details

The migration process:

1. **Creates Default Tenant**: Your existing data becomes the first tenant
2. **Converts User Data**: Adds tenant context to existing users
3. **Migrates Cards/Teams/Players**: Preserves all relationships
4. **Updates IDs**: Converts auto-increment IDs to UUIDs
5. **Preserves Uploads**: Copies image files to tenant-specific directories

---

## Step 7: Verification Steps

### Data Verification:
```bash
# Check tenant was created
psql -d cardvault_production -U cardvault -c "SELECT * FROM tenants;"

# Verify data counts match
echo "SQLite counts:"
sqlite3 carddb.sqlite "SELECT 'Cards:', COUNT(*) FROM cards; SELECT 'Users:', COUNT(*) FROM users; SELECT 'Teams:', COUNT(*) FROM teams; SELECT 'Players:', COUNT(*) FROM players;"

echo "PostgreSQL counts:"
psql -d cardvault_production -U cardvault -c "SELECT 'Cards:', COUNT(*) FROM cards; SELECT 'Users:', COUNT(*) FROM users; SELECT 'Teams:', COUNT(*) FROM teams; SELECT 'Players:', COUNT(*) FROM players;"
```

### Application Testing:
```bash
# Start CardVault in test mode
NODE_ENV=test npm run dev

# Test key functionality:
# - User login
# - Card viewing/adding
# - Search functionality
# - Image uploads
# - Data export
```

---

## Step 8: Go Live

```bash
# Start production application
pm2 start npm --name "cardvault" -- start
pm2 save

# Monitor logs for issues
pm2 logs cardvault
tail -f /var/log/postgresql/postgresql-15-main.log
```

---

## Post-Migration Tasks

### 1. Update nginx Configuration (if needed)
Your existing nginx configuration should continue to work, but verify:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Update Backup Scripts
```bash
# PostgreSQL requires different backup approach
pg_dump -U cardvault cardvault_production > backup_$(date +%Y%m%d).sql

# Add to cron
echo "0 2 * * * pg_dump -U cardvault cardvault_production > /path/to/backups/cardvault_\$(date +%Y\%m\%d).sql" | crontab -
```

### 3. Monitor Performance
- Check PostgreSQL performance metrics
- Monitor memory usage (PostgreSQL uses more RAM than SQLite)
- Verify connection pooling is working properly

---

## Rollback Plan

If you need to rollback to SQLite:

```bash
# Stop PostgreSQL version
pm2 stop cardvault

# Restore backup files
cp carddb.sqlite.backup carddb.sqlite
cp .env.local.backup .env.local

# Checkout previous version
git checkout previous-stable-branch
npm install

# Start SQLite version
pm2 start npm --name "cardvault" -- start
```

---

## Troubleshooting Common Issues

### Migration Script Errors
```bash
# Check PostgreSQL connection
psql -d cardvault_production -U cardvault -c "SELECT version();"

# Verify SQLite file is readable
sqlite3 carddb.sqlite "SELECT COUNT(*) FROM cards;"
```

### Performance Issues
```bash
# Optimize PostgreSQL settings
sudo nano /etc/postgresql/15/main/postgresql.conf
# Increase shared_buffers, work_mem based on your server specs

sudo systemctl restart postgresql
```

### Permission Errors
```bash
# Fix PostgreSQL user permissions
sudo -u postgres psql -c "ALTER USER cardvault SUPERUSER;"
```

---

## Getting Help

- **Documentation**: Check [INSTALLATION.md](./INSTALLATION.md) for fresh installs
- **Community**: Join our Discord/Slack for migration support
- **Issues**: Report problems on GitHub with migration logs
- **Professional Support**: Contact us for managed migration services

---

## Timeline Expectations

- **Small Database** (< 10,000 cards): 15-30 minutes
- **Medium Database** (10,000-100,000 cards): 1-2 hours  
- **Large Database** (100,000+ cards): 2-4 hours

Plan accordingly and perform during low-usage periods.