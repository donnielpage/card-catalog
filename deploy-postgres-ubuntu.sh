#!/bin/bash

# PostgreSQL Production Deployment Script for Ubuntu
# Tested on Ubuntu 20.04/22.04 LTS

set -e

# Configuration Variables
PG_VERSION="15"
PRIMARY_IP="10.0.0.10"
REPLICA_IPS=("10.0.0.11" "10.0.0.12")
DB_NAME="carddb"
DB_USER="carddb_app"
REPL_USER="replicator"
BACKUP_DIR="/var/backups/postgresql"
DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to install PostgreSQL
install_postgresql() {
    echo_info "Installing PostgreSQL ${PG_VERSION}..."
    
    # Add PostgreSQL official APT repository
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt-get update
    
    # Install PostgreSQL and additional tools
    sudo apt-get install -y \
        postgresql-${PG_VERSION} \
        postgresql-client-${PG_VERSION} \
        postgresql-contrib-${PG_VERSION} \
        postgresql-${PG_VERSION}-pg-stat-statements \
        postgresql-${PG_VERSION}-pgvector \
        pgbouncer \
        pgbackrest \
        htop \
        iotop \
        sysstat
    
    echo_info "PostgreSQL ${PG_VERSION} installed successfully"
}

# Function to configure primary server
configure_primary() {
    echo_info "Configuring PostgreSQL primary server..."
    
    # Backup original configuration
    sudo cp /etc/postgresql/${PG_VERSION}/main/postgresql.conf \
            /etc/postgresql/${PG_VERSION}/main/postgresql.conf.backup
    
    # PostgreSQL configuration for primary
    cat <<EOF | sudo tee /etc/postgresql/${PG_VERSION}/main/postgresql.conf.d/01-primary.conf
# Primary Server Configuration for CardDB
# Generated: $(date)

# Connection Settings
listen_addresses = '*'
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings (adjust based on available RAM)
shared_buffers = '4GB'              # 25% of RAM for dedicated server
effective_cache_size = '12GB'       # 75% of RAM
maintenance_work_mem = '1GB'
work_mem = '32MB'
huge_pages = try

# Write Ahead Log
wal_level = replica
wal_buffers = '16MB'
min_wal_size = '1GB'
max_wal_size = '4GB'
wal_keep_size = '1GB'
wal_compression = on

# Replication
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
hot_standby_feedback = on

# Checkpoints
checkpoint_completion_target = 0.9
checkpoint_timeout = '15min'

# Query Tuning
random_page_cost = 1.1              # For SSD storage
effective_io_concurrency = 200      # For SSD storage
default_statistics_target = 100

# Parallel Query Execution
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging
log_destination = 'csvlog'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = '1d'
log_rotation_size = '100MB'
log_line_prefix = '%m [%p] %q%u@%d '
log_statement = 'ddl'
log_duration = off
log_min_duration_statement = 1000   # Log queries over 1 second
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Extensions
shared_preload_libraries = 'pg_stat_statements,auto_explain'

# Auto explain for slow queries
auto_explain.log_min_duration = '1s'
auto_explain.log_analyze = true
auto_explain.log_buffers = true

# Statement tracking
pg_stat_statements.max = 10000
pg_stat_statements.track = all
EOF

    # Configure pg_hba.conf for replication
    cat <<EOF | sudo tee -a /etc/postgresql/${PG_VERSION}/main/pg_hba.conf

# Replication connections
host    replication     ${REPL_USER}     10.0.0.0/24     scram-sha-256
host    all             all              10.0.0.0/24     scram-sha-256
host    all             all              127.0.0.1/32    scram-sha-256
EOF

    # Create replication user
    sudo -u postgres psql <<EOF
CREATE USER ${REPL_USER} WITH REPLICATION ENCRYPTED PASSWORD 'CHANGE_ME_REPL_PASSWORD';
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD 'CHANGE_ME_APP_PASSWORD';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Create replication slot for each replica
SELECT pg_create_physical_replication_slot('replica1_slot');
SELECT pg_create_physical_replication_slot('replica2_slot');
EOF

    # Restart PostgreSQL
    sudo systemctl restart postgresql@${PG_VERSION}-main
    
    echo_info "Primary server configured successfully"
}

# Function to setup monitoring
setup_monitoring() {
    echo_info "Setting up monitoring..."
    
    # Create monitoring user
    sudo -u postgres psql <<EOF
CREATE USER monitoring WITH ENCRYPTED PASSWORD 'CHANGE_ME_MONITOR_PASSWORD';
GRANT pg_monitor TO monitoring;
GRANT CONNECT ON DATABASE ${DB_NAME} TO monitoring;
EOF

    # Create monitoring views
    sudo -u postgres psql -d ${DB_NAME} <<EOF
-- Replication lag view
CREATE OR REPLACE VIEW replication_status AS
SELECT 
    client_addr,
    state,
    sync_state,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replication_lag,
    replay_lag
FROM pg_stat_replication;

-- Connection status view
CREATE OR REPLACE VIEW connection_status AS
SELECT 
    datname,
    count(*) as connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname;

-- Table sizes view
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Grant access to monitoring user
GRANT SELECT ON replication_status TO monitoring;
GRANT SELECT ON connection_status TO monitoring;
GRANT SELECT ON table_sizes TO monitoring;
EOF

    echo_info "Monitoring setup completed"
}

# Function to configure PgBouncer
configure_pgbouncer() {
    echo_info "Configuring PgBouncer..."
    
    # Backup original configuration
    sudo cp /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.backup
    
    # Configure PgBouncer
    cat <<EOF | sudo tee /etc/pgbouncer/pgbouncer.ini
[databases]
# Write pool - connects to primary
${DB_NAME}_write = host=${PRIMARY_IP} port=5432 dbname=${DB_NAME} pool_mode=transaction

# Read pool - connects to replicas (round-robin)
${DB_NAME}_read = host=${REPLICA_IPS[0]},${REPLICA_IPS[1]} port=5432 dbname=${DB_NAME} pool_mode=transaction

# Admin database
pgbouncer = host=127.0.0.1 port=5432 dbname=pgbouncer auth_user=pgbouncer

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
admin_users = admin
stats_users = stats, monitoring

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100

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
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1
stats_period = 60

# Security
server_tls_sslmode = prefer
server_tls_ca_file = /etc/postgresql/ca.crt
server_tls_protocols = secure
EOF

    # Create userlist for PgBouncer
    echo_info "Creating PgBouncer userlist..."
    sudo -u postgres psql -t -c "SELECT '\"' || usename || '\" \"' || passwd || '\"' FROM pg_shadow WHERE usename IN ('${DB_USER}', 'monitoring', 'admin')" > /tmp/userlist.txt
    sudo mv /tmp/userlist.txt /etc/pgbouncer/userlist.txt
    sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
    sudo chmod 600 /etc/pgbouncer/userlist.txt
    
    # Enable and start PgBouncer
    sudo systemctl enable pgbouncer
    sudo systemctl restart pgbouncer
    
    echo_info "PgBouncer configured successfully"
}

# Function to setup automated backups
setup_backups() {
    echo_info "Setting up automated backups..."
    
    # Create backup directory
    sudo mkdir -p ${BACKUP_DIR}
    sudo chown postgres:postgres ${BACKUP_DIR}
    
    # Create backup script
    cat <<'EOF' | sudo tee /usr/local/bin/backup-carddb.sh
#!/bin/bash

# CardDB Backup Script
BACKUP_DIR="/var/backups/postgresql"
DB_NAME="carddb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.dump"
LOG_FILE="/var/log/postgresql/backup.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> ${LOG_FILE}
}

log_message "Starting backup of ${DB_NAME}"

# Perform backup
if pg_dump -h localhost -U postgres -d ${DB_NAME} -Fc -f "${BACKUP_FILE}"; then
    log_message "Backup completed successfully: ${BACKUP_FILE}"
    
    # Compress backup
    gzip "${BACKUP_FILE}"
    log_message "Backup compressed: ${BACKUP_FILE}.gz"
    
    # Upload to S3 (if configured)
    if command -v aws &> /dev/null; then
        if aws s3 cp "${BACKUP_FILE}.gz" "s3://carddb-backups/"; then
            log_message "Backup uploaded to S3"
        else
            log_message "Failed to upload backup to S3"
        fi
    fi
    
    # Remove old local backups (keep last 7 days)
    find ${BACKUP_DIR} -name "${DB_NAME}_*.dump.gz" -mtime +7 -delete
    log_message "Old backups cleaned up"
else
    log_message "Backup failed!"
    exit 1
fi

log_message "Backup process completed"
EOF

    sudo chmod +x /usr/local/bin/backup-carddb.sh
    
    # Add to crontab (daily at 2 AM)
    (crontab -u postgres -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-carddb.sh") | crontab -u postgres -
    
    # Setup pgBackRest for continuous archiving
    sudo mkdir -p /etc/pgbackrest
    cat <<EOF | sudo tee /etc/pgbackrest/pgbackrest.conf
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=4
repo1-retention-archive=4
log-level-console=info
log-level-file=detail
start-fast=y
stop-auto=y
archive-async=y
archive-push-queue-max=4GiB

[${DB_NAME}]
pg1-path=/var/lib/postgresql/${PG_VERSION}/main
pg1-port=5432
pg1-user=postgres
EOF

    echo_info "Backup system configured successfully"
}

# Function to setup firewall rules
setup_firewall() {
    echo_info "Configuring firewall rules..."
    
    # Install UFW if not present
    sudo apt-get install -y ufw
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (adjust port if needed)
    sudo ufw allow 22/tcp
    
    # Allow PostgreSQL from private network only
    sudo ufw allow from 10.0.0.0/24 to any port 5432
    
    # Allow PgBouncer from private network
    sudo ufw allow from 10.0.0.0/24 to any port 6432
    
    # Allow monitoring ports (Prometheus node exporter, etc.)
    sudo ufw allow from 10.0.0.0/24 to any port 9100
    sudo ufw allow from 10.0.0.0/24 to any port 9187
    
    # Enable firewall
    sudo ufw --force enable
    
    echo_info "Firewall configured successfully"
}

# Function to optimize system settings
optimize_system() {
    echo_info "Optimizing system settings..."
    
    # Kernel parameters for PostgreSQL
    cat <<EOF | sudo tee /etc/sysctl.d/30-postgresql-shm.conf
# PostgreSQL optimization
kernel.shmmax = 17179869184
kernel.shmall = 4194304
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
fs.file-max = 65535
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048576
net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 30
vm.swappiness = 10
vm.dirty_background_ratio = 3
vm.dirty_ratio = 40
vm.dirty_expire_centisecs = 500
vm.dirty_writeback_centisecs = 100
EOF

    sudo sysctl -p /etc/sysctl.d/30-postgresql-shm.conf
    
    # Disable transparent huge pages
    echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
    echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
    
    # Add to rc.local for persistence
    cat <<'EOF' | sudo tee /etc/rc.local
#!/bin/bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
exit 0
EOF
    sudo chmod +x /etc/rc.local
    
    echo_info "System optimization completed"
}

# Main installation flow
main() {
    echo_info "Starting PostgreSQL production deployment for CardDB"
    echo_info "This script will configure a PostgreSQL ${PG_VERSION} primary server"
    echo_warn "Please ensure you have updated the configuration variables at the top of this script"
    
    read -p "Continue with installation? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo_info "Installation cancelled"
        exit 1
    fi
    
    # Run installation steps
    install_postgresql
    configure_primary
    setup_monitoring
    configure_pgbouncer
    setup_backups
    setup_firewall
    optimize_system
    
    echo_info "======================================"
    echo_info "PostgreSQL deployment completed!"
    echo_info "======================================"
    echo_info ""
    echo_info "Next steps:"
    echo_info "1. Update passwords in the configuration files"
    echo_info "2. Configure SSL certificates"
    echo_info "3. Set up replicas using the replica setup script"
    echo_info "4. Configure monitoring with Prometheus/Grafana"
    echo_info "5. Test failover procedures"
    echo_info ""
    echo_info "Database connection strings:"
    echo_info "  Write: postgresql://${DB_USER}@localhost:6432/${DB_NAME}_write"
    echo_info "  Read:  postgresql://${DB_USER}@localhost:6432/${DB_NAME}_read"
    echo_info ""
    echo_info "Admin tasks:"
    echo_info "  View connections: sudo -u postgres psql -c 'SELECT * FROM pg_stat_activity;'"
    echo_info "  View replication: sudo -u postgres psql -c 'SELECT * FROM pg_stat_replication;'"
    echo_info "  PgBouncer stats: psql -h localhost -p 6432 pgbouncer -c 'SHOW STATS;'"
}

# Run main function
main "$@"
