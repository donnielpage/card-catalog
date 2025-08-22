# CardVault Installation Guide

## Fresh Installation (PostgreSQL - Recommended)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+ (for multi-tenant support)

### 1. Database Setup

**Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Windows
# Download from https://www.postgresql.org/download/windows/
```

**Create database and user:**
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE cardvault_production;
CREATE USER cardvault WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE cardvault_production TO cardvault;
\q
```

### 2. Install CardVault

```bash
git clone https://github.com/yourusername/cardvault.git
cd cardvault
npm install
```

### 3. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# Authentication
NEXTAUTH_SECRET=your-very-secure-secret-key-here
NEXTAUTH_URL=https://yourdomain.com  # or http://localhost:3000 for development

# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cardvault_production
POSTGRES_USER=cardvault
POSTGRES_PASSWORD=your-secure-password

# Features
ENABLE_MULTI_TENANT=true
```

### 4. Database Schema Setup

```bash
# Create the multi-tenant schema
psql -d cardvault_production -U cardvault -f schema_postgresql.sql

# Optional: Populate with sample data
psql -d cardvault_production -U cardvault -f sample_data_postgresql.sql
```

### 5. Create Initial Tenant and Admin User

```bash
# Start the application
npm run dev

# Use the admin panel or API to create your first tenant and admin user
# Navigate to http://localhost:3000/setup (first-time setup)
```

---

## Legacy Installation (SQLite - Single Tenant)

> **Note**: SQLite mode is deprecated and will be removed in future versions. New installations should use PostgreSQL.

### Quick Setup
```bash
# Create SQLite database
sqlite3 carddb.sqlite < create_database.sql
sqlite3 carddb.sqlite < sample_data.sql

# Add admin user
sqlite3 carddb.sqlite "INSERT INTO users (username, email, firstname, lastname, password_hash, role) VALUES ('admin', 'admin@cardvault.com', 'Admin', 'User', '\$2b\$12\$lObinT/d5hSSaiiiRDMSt.my82WpG8fE7BT22dUjNHeIY3H6LraCi', 'admin');"

# Configure environment
echo "ENABLE_MULTI_TENANT=false" >> .env.local
```

Default admin credentials:
- Username: `admin`
- Password: `password123`

---

## What's Included

### Multi-Tenant Features (PostgreSQL)
- **Tenant Isolation**: Complete data separation between organizations
- **Scalable Architecture**: Support for unlimited tenants
- **Subscription Management**: Built-in billing integration ready
- **Role-Based Access**: Hierarchical permissions per tenant

### Complete MLB Teams (30 teams)
- All National League and American League teams
- Official team colors (primary, secondary, accent)
- Organized by division

### Sample Data
- 4 manufacturers (Topps, Upper Deck, Panini, Bowman)
- 5 legendary players (Jeter, Williams, Ruth, Mantle, Mays)
- 5 sample cards with proper team/player associations

### Features
- Team-colored user avatars based on favorites
- Advanced filtering and search capabilities
- Bulk operations and data import/export
- Audit logging and change tracking
- Mobile-responsive design

---

## Production Deployment

### HTTPS Setup (nginx + Let's Encrypt)
```bash
# Install nginx and certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx configuration
sudo nano /etc/nginx/sites-available/cardvault.com

# Enable site and get SSL certificate
sudo ln -s /etc/nginx/sites-available/cardvault.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d cardvault.com -d www.cardvault.com
```

### Process Management
```bash
# Using PM2 for production
npm install -g pm2
pm2 start npm --name "cardvault" -- start
pm2 save
pm2 startup
```

---

## Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -d cardvault_production -U cardvault -c "SELECT NOW()"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Permission Issues
```bash
# Fix PostgreSQL permissions
sudo -u postgres psql -c "ALTER USER cardvault CREATEDB;"
```

### Environment Variables
```bash
# Verify environment is loaded
npm run dev 2>&1 | grep "Environment:"
```

For additional support, check the [troubleshooting guide](./TROUBLESHOOTING.md) or open an issue on GitHub.