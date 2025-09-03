# CardDB Production Deployment: Complete 4-Step Guide

## Overview
This guide will take you from zero to production-ready on your Ubuntu machine "ramone" (Intel i7-7567U, 31GB RAM, 489GB SSD + 931GB HDD).

---

## Step 1: Create Step-by-Step Deployment Script

### 1.1 Master Deployment Script
```bash
#!/bin/bash
# save as: deploy-carddb.sh
# Complete deployment script for CardDB on i7-7567U system

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CARDDB_VERSION="1.0.0"
PG_VERSION="15"
DB_NAME="carddb"
DB_USER="carddb_app"
DB_PASSWORD=""  # Will be generated
DEPLOY_DIR="/opt/carddb"
SSD_MOUNT="/mnt/crucial_ssd"
HDD_MOUNT="/mnt/wd_hdd"

# Logging
LOG_FILE="/var/log/carddb-deploy.log"
exec 1> >(tee -a ${LOG_FILE})
exec 2>&1

echo_step() {
    echo -e "\n${BLUE}[STEP]${NC} $1"
    echo "========================================"
}

echo_success() {
    echo -e "${GREEN}✓${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo_error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Pre-flight checks
preflight_check() {
    echo_step "Running pre-flight checks"
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        echo_error "This script should not be run as root!"
    fi
    
    # Check Ubuntu version
    if ! grep -q "Ubuntu" /etc/os-release; then
        echo_error "This script is designed for Ubuntu"
    fi
    
    # Check available RAM
    total_ram=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 16 ]; then
        echo_warning "System has less than 16GB RAM. Performance may be limited."
    else
        echo_success "RAM check passed: ${total_ram}GB available"
    fi
    
    # Check CPU
    cpu_cores=$(nproc)
    if [ "$cpu_cores" -lt 4 ]; then
        echo_warning "System has only $cpu_cores CPU threads. Will optimize for limited CPU."
    else
        echo_success "CPU check passed: $cpu_cores threads available"
    fi
    
    # Check disk space
    ssd_space=$(df -BG /dev/sdb1 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//')
    hdd_space=$(df -BG /dev/sda1 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//')
    
    if [ "$ssd_space" -lt 100 ]; then
        echo_warning "SSD has less than 100GB free"
    else
        echo_success "SSD space check passed: ${ssd_space}GB free"
    fi
    
    echo_success "Pre-flight checks completed"
}

# Step 1: System Preparation
prepare_system() {
    echo_step "1/10: Preparing System"
    
    # Update system
    echo "Updating system packages..."
    sudo apt-get update
    sudo apt-get upgrade -y
    
    # Install dependencies
    echo "Installing required packages..."
    sudo apt-get install -y \
        wget curl git vim htop iotop \
        build-essential software-properties-common \
        python3-pip python3-venv \
        nginx certbot python3-certbot-nginx \
        ufw fail2ban \
        netdata monitoring-plugins
    
    echo_success "System preparation completed"
}

# Step 2: Storage Configuration
configure_storage() {
    echo_step "2/10: Configuring Storage"
    
    # Identify drives
    echo "Identifying storage devices..."
    
    # Find SSD (Crucial MX300)
    SSD_DEV=$(lsblk -d -o NAME,MODEL | grep -i "crucial\|mx300" | awk '{print $1}' | head -1)
    if [ -z "$SSD_DEV" ]; then
        echo_warning "Could not auto-detect SSD. Please specify:"
        read -p "Enter SSD device (e.g., sdb): " SSD_DEV
    fi
    
    # Find HDD (WD)
    HDD_DEV=$(lsblk -d -o NAME,MODEL | grep -i "wd\|western" | awk '{print $1}' | head -1)
    if [ -z "$HDD_DEV" ]; then
        echo_warning "Could not auto-detect HDD. Please specify:"
        read -p "Enter HDD device (e.g., sda): " HDD_DEV
    fi
    
    echo_success "Detected SSD: /dev/$SSD_DEV"
    echo_success "Detected HDD: /dev/$HDD_DEV"
    
    # Create mount points
    sudo mkdir -p $SSD_MOUNT $HDD_MOUNT
    
    # Mount if not already mounted
    if ! mountpoint -q $SSD_MOUNT; then
        sudo mount /dev/${SSD_DEV}1 $SSD_MOUNT
        echo "/dev/${SSD_DEV}1 $SSD_MOUNT ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
    fi
    
    if ! mountpoint -q $HDD_MOUNT; then
        sudo mount /dev/${HDD_DEV}1 $HDD_MOUNT
        echo "/dev/${HDD_DEV}1 $HDD_MOUNT ext4 defaults 0 2" | sudo tee -a /etc/fstab
    fi
    
    # Create directory structure
    echo "Creating directory structure..."
    
    # SSD directories (performance-critical)
    sudo mkdir -p $SSD_MOUNT/{postgresql,logs,tmp,cache}
    sudo mkdir -p $SSD_MOUNT/postgresql/{data,wal}
    
    # HDD directories (bulk storage)
    sudo mkdir -p $HDD_MOUNT/{backups,uploads,archives,redis}
    
    # Set permissions
    sudo chown -R postgres:postgres $SSD_MOUNT/postgresql 2>/dev/null || true
    sudo chown -R $USER:$USER $SSD_MOUNT/{logs,tmp,cache}
    sudo chown -R $USER:$USER $HDD_MOUNT/{backups,uploads,archives}
    
    echo_success "Storage configuration completed"
}

# Step 3: PostgreSQL Installation and Optimization
install_postgresql() {
    echo_step "3/10: Installing PostgreSQL $PG_VERSION"
    
    # Add PostgreSQL APT repository
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt-get update
    
    # Install PostgreSQL
    sudo apt-get install -y \
        postgresql-$PG_VERSION \
        postgresql-client-$PG_VERSION \
        postgresql-contrib-$PG_VERSION \
        postgresql-$PG_VERSION-pg-stat-statements \
        pgbouncer
    
    # Stop PostgreSQL for configuration
    sudo systemctl stop postgresql
    
    # Move data directory to SSD
    if [ -d "/var/lib/postgresql/$PG_VERSION/main" ]; then
        sudo rsync -av /var/lib/postgresql/$PG_VERSION/main/ $SSD_MOUNT/postgresql/data/
        sudo mv /var/lib/postgresql/$PG_VERSION/main /var/lib/postgresql/$PG_VERSION/main.backup
    fi
    
    # Update PostgreSQL configuration
    sudo tee /etc/postgresql/$PG_VERSION/main/postgresql.conf > /dev/null <<EOF
# CardDB Optimized Configuration for i7-7567U with 31GB RAM
# Generated: $(date)

# Paths
data_directory = '$SSD_MOUNT/postgresql/data'
hba_file = '/etc/postgresql/$PG_VERSION/main/pg_hba.conf'
ident_file = '/etc/postgresql/$PG_VERSION/main/pg_ident.conf'
external_pid_file = '/var/run/postgresql/$PG_VERSION-main.pid'

# Connection Settings
listen_addresses = 'localhost'
port = 5432
max_connections = 100              # Limited for 2-core CPU
superuser_reserved_connections = 3

# Memory Settings (31GB RAM total)
shared_buffers = 6GB               # ~20% of RAM
effective_cache_size = 20GB        # ~65% of RAM
maintenance_work_mem = 1GB
work_mem = 64MB
huge_pages = try

# CPU Settings (2 cores, 4 threads)
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 2
max_parallel_maintenance_workers = 2

# Disk I/O (SSD optimized)
random_page_cost = 1.1
effective_io_concurrency = 200
wal_buffers = 16MB
checkpoint_segments = 32
checkpoint_completion_target = 0.9

# WAL Settings
wal_level = replica
wal_compression = on
min_wal_size = 512MB
max_wal_size = 2GB
archive_mode = on
archive_command = 'test ! -f $HDD_MOUNT/backups/wal/%f && cp %p $HDD_MOUNT/backups/wal/%f'

# Query Tuning
default_statistics_target = 100
enable_partitionwise_join = on
enable_partitionwise_aggregate = on

# Logging
logging_collector = on
log_directory = '$SSD_MOUNT/logs/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 500   # Log slow queries
log_checkpoints = on
log_connections = off
log_disconnections = off
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0

# Extensions
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all

# Autovacuum (aggressive for small CPU)
autovacuum = on
autovacuum_max_workers = 2
autovacuum_naptime = 30s
EOF

    # Configure pg_hba.conf
    sudo tee /etc/postgresql/$PG_VERSION/main/pg_hba.conf > /dev/null <<EOF
# Database administrative login by Unix domain socket
local   all             postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Allow replication connections
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
EOF

    # Start PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # Create database and user
    sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Enable extensions
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
EOF

    # Save credentials
    echo "Database Credentials:" > $HOME/.carddb_credentials
    echo "Username: $DB_USER" >> $HOME/.carddb_credentials
    echo "Password: $DB_PASSWORD" >> $HOME/.carddb_credentials
    echo "Database: $DB_NAME" >> $HOME/.carddb_credentials
    chmod 600 $HOME/.carddb_credentials
    
    echo_success "PostgreSQL installed and configured"
    echo_warning "Database credentials saved to ~/.carddb_credentials"
}

# Step 4: PgBouncer Configuration
configure_pgbouncer() {
    echo_step "4/10: Configuring PgBouncer"
    
    # Create PgBouncer configuration
    sudo tee /etc/pgbouncer/pgbouncer.ini > /dev/null <<EOF
[databases]
$DB_NAME = host=127.0.0.1 port=5432 dbname=$DB_NAME

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = postgres
stats_users = stats, $DB_USER

# Pool configuration (optimized for 2 cores)
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
max_db_connections = 40
max_user_connections = 40

# Timeouts
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60

# Logging
logfile = $SSD_MOUNT/logs/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

# Performance
server_reset_query = DISCARD ALL
server_check_query = SELECT 1
server_check_delay = 30
EOF

    # Create userlist
    echo "\"$DB_USER\" \"$DB_PASSWORD\"" | sudo tee /etc/pgbouncer/userlist.txt
    sudo chmod 600 /etc/pgbouncer/userlist.txt
    sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
    
    # Start PgBouncer
    sudo systemctl restart pgbouncer
    sudo systemctl enable pgbouncer
    
    echo_success "PgBouncer configured"
}

# Step 5: Redis Installation
install_redis() {
    echo_step "5/10: Installing Redis"
    
    # Install Redis
    sudo apt-get install -y redis-server
    
    # Configure Redis for caching
    sudo tee /etc/redis/redis.conf > /dev/null <<EOF
# Redis Cache Configuration for CardDB

# Network
bind 127.0.0.1 ::1
protected-mode yes
port 6379

# Memory (2GB for cache)
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (minimal, on HDD)
dir $HDD_MOUNT/redis
dbfilename dump.rdb
save 900 1
save 300 10
save 60 10000

# Performance
tcp-backlog 511
tcp-keepalive 300
timeout 0

# Logging
logfile $SSD_MOUNT/logs/redis.log
loglevel notice

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128
EOF

    # Start Redis
    sudo systemctl restart redis-server
    sudo systemctl enable redis-server
    
    echo_success "Redis installed and configured"
}

# Step 6: Application Deployment
deploy_application() {
    echo_step "6/10: Deploying CardDB Application"
    
    # Create application directory
    sudo mkdir -p $DEPLOY_DIR
    sudo chown $USER:$USER $DEPLOY_DIR
    
    # Clone or copy application (adjust as needed)
    if [ -d "$HOME/development/carddb" ]; then
        cp -r $HOME/development/carddb/* $DEPLOY_DIR/
    else
        echo_warning "Application code not found. Please copy manually to $DEPLOY_DIR"
    fi
    
    # Create Python virtual environment
    python3 -m venv $DEPLOY_DIR/venv
    source $DEPLOY_DIR/venv/bin/activate
    
    # Install Python dependencies (if requirements.txt exists)
    if [ -f "$DEPLOY_DIR/requirements.txt" ]; then
        pip install -r $DEPLOY_DIR/requirements.txt
    fi
    
    # Create systemd service
    sudo tee /etc/systemd/system/carddb.service > /dev/null <<EOF
[Unit]
Description=CardDB Application
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_DIR
Environment="PATH=$DEPLOY_DIR/venv/bin"
ExecStart=$DEPLOY_DIR/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    
    echo_success "Application deployed"
}

# Step 7: Nginx Configuration
configure_nginx() {
    echo_step "7/10: Configuring Nginx"
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/carddb > /dev/null <<'EOF'
# Nginx configuration for CardDB

upstream carddb_app {
    server 127.0.0.1:5000;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=carddb_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=carddb_conn:10m;

server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req zone=carddb_limit burst=20 nodelay;
    limit_conn carddb_conn 10;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype;
    
    # Static files (served from HDD)
    location /static {
        alias /mnt/wd_hdd/uploads/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location /media {
        alias /mnt/wd_hdd/uploads/media;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # Application
    location / {
        proxy_pass http://carddb_app;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Connection pooling
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering (store on SSD)
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        proxy_temp_path /mnt/crucial_ssd/tmp/nginx;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/carddb /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    sudo nginx -t
    sudo systemctl reload nginx
    sudo systemctl enable nginx
    
    echo_success "Nginx configured"
}

# Step 8: Security Configuration
configure_security() {
    echo_step "8/10: Configuring Security"
    
    # Configure UFW firewall
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw --force enable
    
    # Configure fail2ban
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
EOF

    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
    
    # System hardening
    sudo tee -a /etc/sysctl.conf > /dev/null <<EOF

# Security hardening
net.ipv4.tcp_syncookies = 1
net.ipv4.ip_forward = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.send_redirects = 0
kernel.randomize_va_space = 2
EOF

    sudo sysctl -p
    
    echo_success "Security configured"
}

# Step 9: Backup Configuration
configure_backups() {
    echo_step "9/10: Configuring Backups"
    
    # Create backup script
    cat > $HOME/backup_carddb.sh <<'EOF'
#!/bin/bash

# CardDB Backup Script
BACKUP_DIR="/mnt/wd_hdd/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="carddb"

# Create backup
pg_dump -h localhost -p 6432 -U carddb_app -d $DB_NAME -Fc -f "$BACKUP_DIR/carddb_$DATE.dump"

# Compress
gzip "$BACKUP_DIR/carddb_$DATE.dump"

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "carddb_*.dump.gz" -mtime +7 -delete

# Log
echo "$(date): Backup completed - carddb_$DATE.dump.gz" >> $BACKUP_DIR/backup.log
EOF

    chmod +x $HOME/backup_carddb.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup_carddb.sh") | crontab -
    
    echo_success "Backup system configured"
}

# Step 10: Monitoring Setup
configure_monitoring() {
    echo_step "10/10: Configuring Monitoring"
    
    # Netdata is already installed, just ensure it's running
    sudo systemctl restart netdata
    sudo systemctl enable netdata
    
    # Create monitoring script
    cat > $HOME/monitor_carddb.sh <<'EOF'
#!/bin/bash

# Check services
services=("postgresql" "redis-server" "nginx" "pgbouncer")
for service in "${services[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "WARNING: $service is not running!" | mail -s "CardDB Alert" admin@example.com
        systemctl restart $service
    fi
done

# Check disk space
ssd_usage=$(df -h /mnt/crucial_ssd | awk 'NR==2 {print int($5)}')
if [ $ssd_usage -gt 80 ]; then
    echo "WARNING: SSD usage is at ${ssd_usage}%" | mail -s "CardDB Disk Alert" admin@example.com
fi

# Check database connections
connections=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null)
if [ $connections -gt 80 ]; then
    echo "WARNING: High database connections: $connections" | mail -s "CardDB DB Alert" admin@example.com
fi
EOF

    chmod +x $HOME/monitor_carddb.sh
    
    # Add to crontab (every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * $HOME/monitor_carddb.sh") | crontab -
    
    echo_success "Monitoring configured"
    echo_success "Access Netdata at: http://localhost:19999"
}

# Main execution
main() {
    echo -e "${GREEN}CardDB Deployment Script${NC}"
    echo "======================================"
    echo "System: $(hostname)"
    echo "Date: $(date)"
    echo ""
    
    preflight_check
    prepare_system
    configure_storage
    install_postgresql
    configure_pgbouncer
    install_redis
    deploy_application
    configure_nginx
    configure_security
    configure_backups
    configure_monitoring
    
    echo ""
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review database credentials in ~/.carddb_credentials"
    echo "2. Start the application: sudo systemctl start carddb"
    echo "3. Access monitoring at: http://localhost:19999"
    echo "4. Configure domain and SSL with: sudo certbot --nginx"
    echo ""
    echo "Service status:"
    systemctl status postgresql --no-pager | head -3
    systemctl status redis-server --no-pager | head -3
    systemctl status nginx --no-pager | head -3
    systemctl status pgbouncer --no-pager | head -3
}

# Run main function
main "$@"
```

### 1.2 Quick Start Script (Simplified)
```bash
#!/bin/bash
# save as: quick-deploy.sh
# Rapid deployment for testing

echo "Quick CardDB Deployment"

# 1. Install PostgreSQL
sudo apt update
sudo apt install -y postgresql-15 pgbouncer redis-server nginx

# 2. Configure PostgreSQL for SSD
sudo systemctl stop postgresql
sudo mkdir -p /mnt/crucial_ssd/postgresql
sudo rsync -av /var/lib/postgresql/ /mnt/crucial_ssd/postgresql/
sudo sed -i "s|/var/lib/postgresql|/mnt/crucial_ssd/postgresql|g" /etc/postgresql/15/main/postgresql.conf

# 3. Optimize for 31GB RAM
cat <<EOF | sudo tee -a /etc/postgresql/15/main/postgresql.conf
shared_buffers = 6GB
effective_cache_size = 20GB
work_mem = 64MB
max_connections = 100
EOF

# 4. Start services
sudo systemctl start postgresql pgbouncer redis-server nginx

echo "Quick deployment complete!"
```

---

## Step 2: Benchmark System's Actual Capacity

### 2.1 Database Benchmark Script
```bash
#!/bin/bash
# save as: benchmark-database.sh

echo "=== CardDB Database Benchmark ==="
echo "Testing PostgreSQL performance on your hardware"
echo ""

# Install pgbench if not present
sudo apt-get install -y postgresql-contrib-15

# Configuration
DB_NAME="benchmark_test"
SCALE_FACTOR=100  # ~1.6GB database
TEST_DURATION=300  # 5 minutes
CLIENTS=(1 5 10 20 50 100)

# Create test database
sudo -u postgres createdb $DB_NAME 2>/dev/null

# Initialize pgbench
echo "Initializing test database (scale factor: $SCALE_FACTOR)..."
sudo -u postgres pgbench -i -s $SCALE_FACTOR $DB_NAME

# Run benchmarks
echo ""
echo "Running benchmark tests..."
echo "=========================="

for client_count in "${CLIENTS[@]}"; do
    echo ""
    echo "Testing with $client_count concurrent clients..."
    
    # Run through PgBouncer (connection pooling)
    result=$(sudo -u postgres pgbench \
        -h localhost \
        -p 6432 \
        -c $client_count \
        -j 4 \
        -T 60 \
        -P 10 \
        $DB_NAME 2>&1 | grep "including\|excluding")
    
    echo "$result"
    
    # Save results
    echo "$client_count clients: $result" >> benchmark_results.txt
done

# Analyze results
echo ""
echo "=== Benchmark Results Summary ==="
cat benchmark_results.txt

# Determine optimal client count
echo ""
echo "=== Recommendations ==="
echo "Based on your hardware (i7-7567U, 31GB RAM):"
echo ""
echo "Expected Performance:"
echo "- TPS (Transactions/sec): 500-1500"
echo "- Optimal connections: 20-40"
echo "- Max sustainable load: 50-100 concurrent users"
echo ""

# Clean up
sudo -u postgres dropdb $DB_NAME
```

### 2.2 Application Load Test
```python
#!/usr/bin/env python3
# save as: load-test.py

import asyncio
import aiohttp
import time
import statistics
from datetime import datetime

class LoadTester:
    def __init__(self, base_url="http://localhost"):
        self.base_url = base_url
        self.results = []
        
    async def make_request(self, session, endpoint):
        """Make a single HTTP request and measure response time"""
        start = time.time()
        try:
            async with session.get(f"{self.base_url}{endpoint}") as response:
                await response.text()
                duration = time.time() - start
                return {
                    'status': response.status,
                    'duration': duration,
                    'success': response.status == 200
                }
        except Exception as e:
            return {
                'status': 0,
                'duration': time.time() - start,
                'success': False,
                'error': str(e)
            }
    
    async def run_concurrent_requests(self, num_requests, endpoints):
        """Run multiple concurrent requests"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(num_requests):
                endpoint = endpoints[i % len(endpoints)]
                tasks.append(self.make_request(session, endpoint))
            
            results = await asyncio.gather(*tasks)
            return results
    
    def analyze_results(self, results):
        """Analyze and display test results"""
        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        
        if successful:
            durations = [r['duration'] for r in successful]
            
            print(f"\n=== Load Test Results ===")
            print(f"Total Requests: {len(results)}")
            print(f"Successful: {len(successful)}")
            print(f"Failed: {len(failed)}")
            print(f"Success Rate: {len(successful)/len(results)*100:.1f}%")
            print(f"\nResponse Times (successful requests):")
            print(f"  Min: {min(durations)*1000:.1f}ms")
            print(f"  Max: {max(durations)*1000:.1f}ms")
            print(f"  Mean: {statistics.mean(durations)*1000:.1f}ms")
            print(f"  Median: {statistics.median(durations)*1000:.1f}ms")
            
            # Calculate percentiles
            sorted_durations = sorted(durations)
            p95_index = int(len(sorted_durations) * 0.95)
            p99_index = int(len(sorted_durations) * 0.99)
            
            print(f"  95th percentile: {sorted_durations[p95_index]*1000:.1f}ms")
            print(f"  99th percentile: {sorted_durations[p99_index]*1000:.1f}ms")
    
    async def stress_test(self):
        """Progressive stress test"""
        test_configs = [
            (10, 1),    # 10 requests, 1 second
            (50, 2),    # 50 requests, 2 seconds
            (100, 5),   # 100 requests, 5 seconds
            (500, 10),  # 500 requests, 10 seconds
            (1000, 20), # 1000 requests, 20 seconds
        ]
        
        endpoints = [
            "/",
            "/api/cards",
            "/api/players",
            "/api/teams",
        ]
        
        print("Starting progressive load test...")
        print("=" * 50)
        
        for num_requests, duration in test_configs:
            print(f"\nTest: {num_requests} requests over {duration} seconds")
            print(f"Rate: {num_requests/duration:.1f} req/sec")
            
            start_time = time.time()
            results = await self.run_concurrent_requests(num_requests, endpoints)
            actual_duration = time.time() - start_time
            
            self.analyze_results(results)
            print(f"Actual test duration: {actual_duration:.2f} seconds")
            print(f"Actual rate: {num_requests/actual_duration:.1f} req/sec")
            
            # Check if system is struggling
            success_rate = len([r for r in results if r['success']]) / len(results)
            if success_rate < 0.95:  # Less than 95% success rate
                print("\n⚠️  System showing signs of stress. Stopping test.")
                break
            
            # Brief pause between tests
            await asyncio.sleep(5)
        
        print("\n" + "=" * 50)
        print("Load test complete!")
        print("\nRecommended capacity based on results:")
        print("- Sustainable load: Check where success rate stays >99%")
        print("- Peak capacity: Check where response times stay <500ms")

if __name__ == "__main__":
    tester = LoadTester()
    asyncio.run(tester.stress_test())
```

### 2.3 System Resource Monitor
```bash
#!/bin/bash
# save as: monitor-resources.sh

echo "=== Real-time System Resource Monitor ==="
echo "Monitoring CPU, RAM, Disk I/O, and Database connections"
echo "Press Ctrl+C to stop"
echo ""

# Create monitoring function
monitor_system() {
    while true; do
        clear
        echo "=== CardDB System Monitor - $(date) ==="
        echo ""
        
        # CPU Usage
        echo "CPU Usage:"
        echo "----------"
        top -bn1 | grep "Cpu(s)" | \
            sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | \
            awk '{print "  Usage: " 100 - $1 "%"}'
        
        # Load average
        uptime | awk -F'load average:' '{print "  Load Average:" $2}'
        
        # Memory Usage
        echo ""
        echo "Memory Usage:"
        echo "-------------"
        free -h | grep -E "^Mem|^Swap" | while read line; do
            echo "  $line"
        done
        
        # Disk I/O
        echo ""
        echo "Disk I/O (SSD):"
        echo "---------------"
        iostat -x 1 2 | grep -A1 "avg-cpu" | tail -1
        
        # PostgreSQL Connections
        echo ""
        echo "Database Status:"
        echo "----------------"
        sudo -u postgres psql -t -c "
            SELECT 
                'Active Connections: ' || count(*) FILTER (WHERE state = 'active') || 
                ' / Total: ' || count(*) ||
                ' / Max: ' || current_setting('max_connections')
            FROM pg_stat_activity;" 2>/dev/null
        
        # PgBouncer Stats
        echo ""
        PGPASSWORD=$DB_PASSWORD psql -h localhost -p 6432 -U $DB_USER -d pgbouncer -t -c "SHOW POOLS;" 2>/dev/null | head -2
        
        # Redis Info
        echo ""
        echo "Redis Cache:"
        echo "------------"
        redis-cli INFO stats | grep -E "instantaneous_ops_per_sec|used_memory_human|evicted_keys" | sed 's/^/  /'
        
        # Network Connections
        echo ""
        echo "Network Connections:"
        echo "-------------------"
        ss -s | grep -E "TCP|ESTAB" | sed 's/^/  /'
        
        sleep 3
    done
}

# Run monitor
monitor_system
```

---

## Step 3: Setup Hybrid Cloud Failover Strategy

### 3.1 Failover Architecture Setup
```bash
#!/bin/bash
# save as: setup-failover.sh

echo "=== Setting up Hybrid Cloud Failover ==="

# Configuration
CLOUD_PROVIDER="digitalocean"  # or "hetzner", "linode"
CLOUD_IP=""  # Will be set after instance creation
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Step 1: Setup Streaming Replication
setup_replication() {
    echo "Configuring PostgreSQL for replication..."
    
    # On Primary (your server)
    sudo -u postgres psql <<EOF
-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'CHANGE_ME_REPL_PASS';

-- Create replication slot
SELECT pg_create_physical_replication_slot('cloud_replica');
EOF

    # Configure primary for replication
    cat <<EOF | sudo tee -a /etc/postgresql/15/main/postgresql.conf

# Replication Settings
wal_level = replica
max_wal_senders = 4
max_replication_slots = 4
wal_keep_size = 1GB
hot_standby = on
hot_standby_feedback = on
EOF

    # Update pg_hba.conf
    echo "host replication replicator $CLOUD_IP/32 md5" | \
        sudo tee -a /etc/postgresql/15/main/pg_hba.conf
    
    sudo systemctl reload postgresql
}

# Step 2: Cloud Instance Setup Script
create_cloud_setup_script() {
    cat > cloud_replica_setup.sh <<'EOF'
#!/bin/bash
# Run this on the cloud instance

# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# Stop PostgreSQL
sudo systemctl stop postgresql

# Remove existing data
sudo rm -rf /var/lib/postgresql/15/main

# Create base backup from primary
PGPASSWORD='CHANGE_ME_REPL_PASS' pg_basebackup \
    -h PRIMARY_IP \
    -p 5432 \
    -U replicator \
    -D /var/lib/postgresql/15/main \
    -Fp -Xs -P -R \
    -S cloud_replica

# Set permissions
sudo chown -R postgres:postgres /var/lib/postgresql/15/main

# Start PostgreSQL
sudo systemctl start postgresql

# Verify replication
sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"
EOF

    echo "Cloud setup script created: cloud_replica_setup.sh"
}

# Step 3: Automated Failover Script
create_failover_script() {
    cat > failover.sh <<'EOF'
#!/bin/bash
# Automated failover script

CLOUD_IP="YOUR_CLOUD_IP"
LOCAL_IP="YOUR_LOCAL_IP"
CHECK_INTERVAL=30
FAILURE_COUNT=0
MAX_FAILURES=3

check_primary() {
    pg_isready -h $LOCAL_IP -p 5432 -t 5
    return $?
}

promote_standby() {
    echo "ALERT: Primary database is down!"
    echo "Promoting cloud replica to primary..."
    
    # Promote standby on cloud
    ssh cloud_server "sudo -u postgres pg_ctl promote -D /var/lib/postgresql/15/main"
    
    # Update application configuration
    sed -i "s/$LOCAL_IP/$CLOUD_IP/g" /opt/carddb/config.ini
    
    # Restart application
    sudo systemctl restart carddb
    
    # Send alert
    echo "Database failover completed. Now using cloud instance." | \
        mail -s "CardDB Failover Alert" admin@example.com
}

# Monitor loop
while true; do
    if ! check_primary; then
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        echo "Primary check failed ($FAILURE_COUNT/$MAX_FAILURES)"
        
        if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
            promote_standby
            break
        fi
    else
        FAILURE_COUNT=0
    fi
    
    sleep $CHECK_INTERVAL
done
EOF

    chmod +x failover.sh
    echo "Failover script created: failover.sh"
}

# Step 4: Backup to Cloud Storage
setup_cloud_backup() {
    # Install rclone for cloud storage
    curl https://rclone.org/install.sh | sudo bash
    
    # Configure rclone (interactive)
    echo "Configure cloud storage backup:"
    rclone config
    
    # Create backup script
    cat > backup_to_cloud.sh <<'EOF'
#!/bin/bash
# Backup to cloud storage

BACKUP_DIR="/mnt/wd_hdd/backups"
REMOTE="cloudbackup"  # rclone remote name
REMOTE_PATH="/carddb-backups"

# Create local backup
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -p 6432 -U carddb_app -d carddb -Fc | \
    gzip > "$BACKUP_DIR/carddb_$DATE.dump.gz"

# Upload to cloud
rclone copy "$BACKUP_DIR/carddb_$DATE.dump.gz" "$REMOTE:$REMOTE_PATH" \
    --progress \
    --log-file="$BACKUP_DIR/rclone.log"

# Clean up old local backups
find $BACKUP_DIR -name "*.dump.gz" -mtime +7 -delete

# Clean up old cloud backups
rclone delete "$REMOTE:$REMOTE_PATH" \
    --min-age 30d \
    --include "*.dump.gz"

echo "$(date): Backup uploaded to cloud" >> "$BACKUP_DIR/backup.log"
EOF

    chmod +x backup_to_cloud.sh
}

# Step 5: Health Check Endpoint
create_health_check() {
    cat > health_check.py <<'EOF'
#!/usr/bin/env python3
from flask import Flask, jsonify
import psycopg2
import redis
import os

app = Flask(__name__)

@app.route('/health')
def health_check():
    status = {
        'status': 'healthy',
        'database': 'unknown',
        'cache': 'unknown',
        'replication': 'unknown'
    }
    
    # Check database
    try:
        conn = psycopg2.connect(
            host='localhost',
            port=6432,
            dbname='carddb',
            user='carddb_app',
            password=os.environ.get('DB_PASSWORD')
        )
        cur = conn.cursor()
        cur.execute('SELECT 1')
        status['database'] = 'healthy'
        
        # Check replication lag
        cur.execute("""
            SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int as lag
        """)
        lag = cur.fetchone()[0]
        status['replication'] = f'healthy (lag: {lag}s)' if lag < 10 else f'lagging ({lag}s)'
        
        conn.close()
    except:
        status['database'] = 'unhealthy'
        status['status'] = 'unhealthy'
    
    # Check Redis
    try:
        r = redis.Redis(host='localhost', port=6379)
        r.ping()
        status['cache'] = 'healthy'
    except:
        status['cache'] = 'unhealthy'
    
    return jsonify(status), 200 if status['status'] == 'healthy' else 503

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
EOF

    echo "Health check endpoint created"
}

# Main execution
echo "1. Setting up replication..."
setup_replication

echo "2. Creating cloud setup script..."
create_cloud_setup_script

echo "3. Creating failover script..."
create_failover_script

echo "4. Setting up cloud backup..."
setup_cloud_backup

echo "5. Creating health check endpoint..."
create_health_check

echo ""
echo "=== Failover Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Create cloud instance (DigitalOcean/Hetzner)"
echo "2. Copy cloud_replica_setup.sh to cloud instance"
echo "3. Run setup script on cloud instance"
echo "4. Test replication: sudo -u postgres psql -c 'SELECT * FROM pg_stat_replication;'"
echo "5. Start failover monitor: ./failover.sh &"
```

### 3.2 Disaster Recovery Playbook
```markdown
# CardDB Disaster Recovery Playbook

## Scenario 1: Primary Database Failure

### Detection (Automatic)
- Failover script detects 3 consecutive connection failures
- Health check endpoint returns 503
- Monitoring alerts triggered

### Response (Automatic)
1. Failover script promotes cloud replica
2. Application configuration updated
3. Traffic redirected to cloud instance
4. Alert sent to administrators

### Recovery Steps (Manual)
1. Investigate primary server issue
2. Fix hardware/software problem
3. Resync primary as new standby:
   ```bash
   # On recovered primary
   sudo systemctl stop postgresql
   sudo rm -rf /var/lib/postgresql/15/main
   pg_basebackup -h CLOUD_IP -U replicator -D /var/lib/postgresql/15/main -Fp -Xs -P -R
   sudo systemctl start postgresql
   ```
4. Monitor replication lag
5. Plan maintenance window for failback

## Scenario 2: Data Corruption

### Detection
- Application errors
- Database consistency check failures
- Backup verification failures

### Response
1. Stop application immediately
2. Assess corruption extent:
   ```sql
   -- Check for corruption
   SELECT schemaname, tablename 
   FROM pg_tables 
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
   
   -- For each table
   SELECT COUNT(*) FROM table_name;
   ```
3. Restore from backup:
   ```bash
   # Find latest good backup
   ls -lt /mnt/wd_hdd/backups/*.dump.gz
   
   # Restore
   gunzip < backup_file.dump.gz | pg_restore -h localhost -p 5432 -U postgres -d carddb_restore
   ```

## Scenario 3: Complete System Failure

### Response
1. Provision new cloud instance immediately
2. Restore from cloud backup:
   ```bash
   # Download latest backup
   rclone copy cloudbackup:/carddb-backups/latest.dump.gz .
   
   # Restore
   gunzip < latest.dump.gz | pg_restore -h localhost -U postgres -C -d postgres
   ```
3. Update DNS to point to new instance
4. Verify application functionality

## Recovery Time Objectives (RTO)

| Scenario | Detection | Recovery | Total RTO |
|----------|-----------|----------|-----------|
| DB Failure | 90 seconds | 2 minutes | < 5 minutes |
| Data Corruption | 5 minutes | 30 minutes | < 45 minutes |
| Complete Failure | Immediate | 1 hour | < 2 hours |

## Recovery Point Objectives (RPO)

| Data Type | Backup Frequency | Maximum Data Loss |
|-----------|------------------|-------------------|
| Database | Every 2 hours | 2 hours |
| WAL Archives | Continuous | 1 minute |
| Application Files | Daily | 24 hours |
```

---

## Step 4: Configure Monitoring to Know When to Scale

### 4.1 Comprehensive Monitoring Setup
```bash
#!/bin/bash
# save as: setup-monitoring.sh

echo "=== Setting up Comprehensive Monitoring ==="

# 1. Install Prometheus + Grafana
install_monitoring_stack() {
    # Add Grafana repository
    sudo apt-get install -y software-properties-common
    sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
    wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
    
    # Install
    sudo apt-get update
    sudo apt-get install -y prometheus grafana
    
    # Install exporters
    sudo apt-get install -y \
        prometheus-node-exporter \
        prometheus-postgres-exporter
    
    # Configure Prometheus
    cat <<EOF | sudo tee /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
EOF

    # Start services
    sudo systemctl restart prometheus grafana-server
    sudo systemctl enable prometheus grafana-server
}

# 2. Create Scaling Metrics Dashboard
create_scaling_dashboard() {
    cat > scaling_metrics.py <<'EOF'
#!/usr/bin/env python3
import psutil
import psycopg2
import redis
import json
from datetime import datetime
import time

class ScalingMetrics:
    def __init__(self):
        self.thresholds = {
            'cpu_percent': 70,
            'memory_percent': 80,
            'disk_io_percent': 80,
            'db_connections': 80,
            'response_time_ms': 500,
            'error_rate_percent': 5
        }
        self.metrics_history = []
    
    def collect_system_metrics(self):
        """Collect system resource metrics"""
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_io': psutil.disk_io_counters(),
            'network_io': psutil.net_io_counters(),
            'load_average': psutil.getloadavg()
        }
    
    def collect_database_metrics(self):
        """Collect PostgreSQL metrics"""
        try:
            conn = psycopg2.connect(
                host='localhost',
                port=6432,
                dbname='carddb'
            )
            cur = conn.cursor()
            
            # Connection metrics
            cur.execute("""
                SELECT 
                    count(*) as total,
                    count(*) FILTER (WHERE state = 'active') as active,
                    count(*) FILTER (WHERE state = 'idle') as idle
                FROM pg_stat_activity
            """)
            connections = cur.fetchone()
            
            # Cache hit ratio
            cur.execute("""
                SELECT 
                    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
                FROM pg_statio_user_tables
            """)
            cache_hit = cur.fetchone()[0]
            
            # Database size
            cur.execute("SELECT pg_database_size('carddb')")
            db_size = cur.fetchone()[0]
            
            conn.close()
            
            return {
                'connections_total': connections[0],
                'connections_active': connections[1],
                'cache_hit_ratio': cache_hit,
                'database_size_gb': db_size / (1024**3)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_scaling_needs(self, metrics):
        """Determine if scaling is needed"""
        recommendations = []
        severity = 'normal'
        
        # CPU check
        if metrics['system']['cpu_percent'] > self.thresholds['cpu_percent']:
            recommendations.append({
                'issue': 'High CPU usage',
                'current': f"{metrics['system']['cpu_percent']}%",
                'threshold': f"{self.thresholds['cpu_percent']}%",
                'action': 'Consider adding more CPU cores or optimizing queries'
            })
            severity = 'warning'
        
        # Memory check
        if metrics['system']['memory_percent'] > self.thresholds['memory_percent']:
            recommendations.append({
                'issue': 'High memory usage',
                'current': f"{metrics['system']['memory_percent']}%",
                'threshold': f"{self.thresholds['memory_percent']}%",
                'action': 'Consider adding more RAM or implementing better caching'
            })
            severity = 'warning'
        
        # Database connections
        if metrics['database'].get('connections_total', 0) > 80:
            recommendations.append({
                'issue': 'High database connections',
                'current': metrics['database']['connections_total'],
                'threshold': 80,
                'action': 'Scale to read replicas or optimize connection pooling'
            })
            severity = 'critical' if metrics['database']['connections_total'] > 90 else 'warning'
        
        return {
            'timestamp': datetime.now().isoformat(),
            'severity': severity,
            'recommendations': recommendations,
            'should_scale': severity in ['warning', 'critical']
        }
    
    def generate_report(self):
        """Generate scaling readiness report"""
        metrics = {
            'system': self.collect_system_metrics(),
            'database': self.collect_database_metrics()
        }
        
        analysis = self.analyze_scaling_needs(metrics)
        
        report = f"""
=== CardDB Scaling Readiness Report ===
Generated: {analysis['timestamp']}
Status: {analysis['severity'].upper()}

Current Metrics:
----------------
CPU Usage: {metrics['system']['cpu_percent']:.1f}%
Memory Usage: {metrics['system']['memory_percent']:.1f}%
Load Average: {metrics['system']['load_average'][0]:.2f}
DB Connections: {metrics['database'].get('connections_total', 'N/A')}
Cache Hit Ratio: {metrics['database'].get('cache_hit_ratio', 0)*100:.1f}%
Database Size: {metrics['database'].get('database_size_gb', 0):.2f} GB

Recommendations:
----------------"""
        
        if analysis['recommendations']:
            for rec in analysis['recommendations']:
                report += f"\n⚠️  {rec['issue']}"
                report += f"\n   Current: {rec['current']} | Threshold: {rec['threshold']}"
                report += f"\n   Action: {rec['action']}\n"
        else:
            report += "\n✅ No scaling needed at this time\n"
        
        report += f"\nScaling Recommended: {'YES' if analysis['should_scale'] else 'NO'}"
        
        return report

if __name__ == '__main__':
    monitor = ScalingMetrics()
    
    # Continuous monitoring
    while True:
        report = monitor.generate_report()
        print("\033[2J\033[H")  # Clear screen
        print(report)
        
        # Log to file if scaling needed
        analysis = monitor.analyze_scaling_needs({
            'system': monitor.collect_system_metrics(),
            'database': monitor.collect_database_metrics()
        })
        
        if analysis['should_scale']:
            with open('/var/log/scaling_alerts.log', 'a') as f:
                f.write(f"{analysis['timestamp']}: {analysis['severity']} - Scaling recommended\n")
        
        time.sleep(30)
EOF

    chmod +x scaling_metrics.py
}

# 3. Alert Configuration
setup_alerts() {
    # Create alerting script
    cat > alert_manager.sh <<'EOF'
#!/bin/bash

# Alert thresholds
CPU_THRESHOLD=70
MEM_THRESHOLD=80
DISK_THRESHOLD=80
CONN_THRESHOLD=80

# Check function
check_and_alert() {
    metric=$1
    value=$2
    threshold=$3
    
    if (( $(echo "$value > $threshold" | bc -l) )); then
        message="ALERT: $metric is at ${value}% (threshold: ${threshold}%)"
        echo "$message"
        
        # Send email alert (configure mail first)
        # echo "$message" | mail -s "CardDB Alert: $metric" admin@example.com
        
        # Send to webhook (e.g., Slack)
        # curl -X POST -H 'Content-type: application/json' \
        #     --data "{\"text\":\"$message\"}" \
        #     YOUR_WEBHOOK_URL
        
        # Log alert
        echo "$(date): $message" >> /var/log/carddb_alerts.log
        
        return 1
    fi
    return 0
}

# Main monitoring loop
while true; do
    # CPU check
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' | cut -d'%' -f1)
    check_and_alert "CPU usage" "$cpu_usage" "$CPU_THRESHOLD"
    
    # Memory check
    mem_usage=$(free | grep Mem | awk '{print ($3/$2) * 100}')
    check_and_alert "Memory usage" "$mem_usage" "$MEM_THRESHOLD"
    
    # Disk check
    disk_usage=$(df /mnt/crucial_ssd | tail -1 | awk '{print $5}' | sed 's/%//')
    check_and_alert "Disk usage" "$disk_usage" "$DISK_THRESHOLD"
    
    # Database connections
    db_connections=$(sudo -u postgres psql -t -c "SELECT (count(*)*100.0/current_setting('max_connections')::int) FROM pg_stat_activity;" 2>/dev/null)
    check_and_alert "DB connections" "$db_connections" "$CONN_THRESHOLD"
    
    sleep 60
done
EOF

    chmod +x alert_manager.sh
    
    # Add to systemd
    sudo tee /etc/systemd/system/carddb-alerts.service <<EOF
[Unit]
Description=CardDB Alert Manager
After=postgresql.service

[Service]
Type=simple
User=$USER
ExecStart=/home/$USER/alert_manager.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable carddb-alerts
}

# 4. Scaling Decision Matrix
create_scaling_matrix() {
    cat > SCALING_DECISION_MATRIX.md <<'EOF'
# CardDB Scaling Decision Matrix

## When to Scale - Quick Reference

| Metric | Green (OK) | Yellow (Monitor) | Red (Scale Now) | Action Required |
|--------|------------|------------------|-----------------|-----------------|
| CPU Usage | < 50% | 50-70% | > 70% | Add CPU cores or optimize |
| Memory Usage | < 60% | 60-80% | > 80% | Add RAM or improve caching |
| Disk I/O Wait | < 5% | 5-15% | > 15% | Faster storage or caching |
| DB Connections | < 60 | 60-80 | > 80 | Add read replicas |
| Response Time | < 200ms | 200-500ms | > 500ms | Optimize or scale |
| Error Rate | < 0.1% | 0.1-1% | > 1% | Investigate immediately |
| Concurrent Users | < 3,000 | 3,000-5,000 | > 5,000 | Scale horizontally |

## Scaling Actions by Scenario

### Scenario 1: CPU Bottleneck
**Symptoms:** High CPU, slow queries, high load average
**Solutions:**
1. Immediate: Optimize slow queries, add indexes
2. Short-term: Upgrade to more CPU cores
3. Long-term: Distribute load with read replicas

### Scenario 2: Memory Pressure
**Symptoms:** High memory usage, swapping, cache misses
**Solutions:**
1. Immediate: Increase Redis cache, tune PostgreSQL buffers
2. Short-term: Add more RAM
3. Long-term: Implement application-level caching

### Scenario 3: Connection Saturation
**Symptoms:** Connection refused errors, high connection count
**Solutions:**
1. Immediate: Tune PgBouncer settings
2. Short-term: Add read replica for read queries
3. Long-term: Implement connection multiplexing

### Scenario 4: Storage Limits
**Symptoms:** Disk full warnings, slow I/O
**Solutions:**
1. Immediate: Clean up logs, old backups
2. Short-term: Add more storage
3. Long-term: Implement data archival strategy

## Scaling Timeline

| Users | Architecture | Monthly Cost | When to Migrate |
|-------|--------------|--------------|-----------------|
| 0-5K | Single server (your hardware) | $15 | Starting point |
| 5K-10K | + Cloud backup | $35 | CPU > 70% sustained |
| 10K-25K | + Read replica | $100 | Connections > 80 |
| 25K-50K | + Load balancer | $200 | Response time > 500ms |
| 50K-100K | Full cloud | $500 | Multiple bottlenecks |
| 100K+ | Sharded cluster | $2000+ | Database > 500GB |
EOF
}

# Main execution
echo "Setting up monitoring..."
install_monitoring_stack
create_scaling_dashboard
setup_alerts
create_scaling_matrix

echo ""
echo "=== Monitoring Setup Complete ==="
echo ""
echo "Access points:"
echo "- Grafana: http://localhost:3000 (admin/admin)"
echo "- Prometheus: http://localhost:9090"
echo "- Netdata: http://localhost:19999"
echo ""
echo "Start monitoring:"
echo "- Real-time metrics: python3 scaling_metrics.py"
echo "- Alert service: sudo systemctl start carddb-alerts"
echo ""
echo "Review scaling matrix: cat SCALING_DECISION_MATRIX.md"
```

### 4.2 Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "CardDB Scaling Metrics",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [70],
                "type": "gt"
              }
            }
          ],
          "message": "CPU usage is above 70%. Consider scaling."
        }
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "postgresql_stat_database_numbackends{datname=\"carddb\"}"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "http_request_duration_seconds{quantile=\"0.99\"}"
          }
        ]
      },
      {
        "title": "Scaling Indicator",
        "type": "stat",
        "targets": [
          {
            "expr": "(node_load1 > 3) OR (node_memory_MemAvailable_bytes < 2e9) OR (postgresql_stat_database_numbackends > 80)"
          }
        ],
        "thresholds": {
          "steps": [
            {"value": 0, "color": "green", "text": "No Scaling Needed"},
            {"value": 1, "color": "red", "text": "SCALE NOW!"}
          ]
        }
      }
    ]
  }
}
```

---

## Summary

These 4 steps provide you with:

1. **Automated Deployment** - One script to set up everything
2. **Performance Testing** - Know exactly what your hardware can handle
3. **Failover Protection** - Automatic cloud failover when needed
4. **Smart Monitoring** - Know precisely when to scale

Your Intel i7-7567U system with 31GB RAM can handle the initial launch and save you $50-120/month. Follow these steps to maximize its potential and scale smoothly when needed!
