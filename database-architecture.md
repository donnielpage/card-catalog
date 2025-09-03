# Scalable Database Architecture for CardDB

## Overview
This document outlines a production-ready, scalable database architecture for the CardDB project running on Ubuntu Linux.

## Architecture Options Ranked by Practicality

### Option 1: PostgreSQL with Master-Slave Replication (Recommended)

**Best for:** Most web applications, 10K-1M users, read-heavy workloads

#### Components:
1. **PostgreSQL 15+ Primary Server**
   - Handles all writes
   - Streams changes to replicas
   - 8-16 CPU cores, 32-64GB RAM for moderate load

2. **PostgreSQL Read Replicas (2-5 instances)**
   - Handle read queries
   - Asynchronous streaming replication
   - Can promote to primary if needed

3. **PgBouncer Connection Pooler**
   - Reduces connection overhead
   - Routes queries to appropriate servers
   - Lightweight (runs on 1GB RAM)

4. **HAProxy Load Balancer**
   - Distributes read traffic across replicas
   - Health checking and failover
   - SSL termination

#### Setup Example:

```bash
# Primary PostgreSQL Configuration (postgresql.conf)
listen_addresses = '*'
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
wal_level = replica
max_wal_senders = 10
wal_keep_segments = 64
hot_standby = on

# Replication setup (pg_hba.conf)
host    replication     replicator      10.0.0.0/24      md5
host    all            all             10.0.0.0/24      md5
```

```bash
# PgBouncer Configuration (pgbouncer.ini)
[databases]
carddb_write = host=10.0.0.10 port=5432 dbname=carddb
carddb_read = host=10.0.0.11,10.0.0.12,10.0.0.13 port=5432 dbname=carddb

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

### Option 2: PostgreSQL with Citus Extension (Horizontal Scaling)

**Best for:** Very large datasets, 1M+ users, need true horizontal scaling

```sql
-- Enable Citus
CREATE EXTENSION citus;

-- Distribute tables
SELECT create_distributed_table('cards', 'id');
SELECT create_distributed_table('users', 'tenant_id');
SELECT create_distributed_table('collections', 'user_id');

-- Co-locate related tables
SELECT create_distributed_table('collection_items', 'collection_id', 
  colocate_with => 'collections');
```

#### Architecture:
```yaml
┌────────────────────────────────────────┐
│         Citus Coordinator              │
│     (Query Router & Planner)           │
└────────────────┬───────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Worker 1│ │ Worker 2│ │ Worker 3│
│ Shard   │ │ Shard   │ │ Shard   │
│ 1,4,7   │ │ 2,5,8   │ │ 3,6,9   │
└─────────┘ └─────────┘ └─────────┘
```

### Option 3: PostgreSQL + Redis Cache Layer

**Best for:** High read performance, session management, real-time features

```python
# Example caching strategy
import redis
import json
import psycopg2

class CardDatabase:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=0)
        self.pg = psycopg2.connect("dbname=carddb")
    
    def get_card(self, card_id):
        # Check cache first
        cached = self.redis.get(f"card:{card_id}")
        if cached:
            return json.loads(cached)
        
        # Fall back to database
        cursor = self.pg.cursor()
        cursor.execute("SELECT * FROM cards WHERE id = %s", (card_id,))
        card = cursor.fetchone()
        
        # Cache for 1 hour
        self.redis.setex(f"card:{card_id}", 3600, json.dumps(card))
        return card
```

### Option 4: Multi-Database Architecture (Polyglot Persistence)

**Best for:** Complex requirements, different data access patterns

```yaml
Architecture:
┌──────────────────────────────────────────────────┐
│              Application Layer                    │
├──────────────────────────────────────────────────┤
│          Database Abstraction Layer              │
└────┬──────────┬──────────┬──────────┬───────────┘
     │          │          │          │
┌────▼────┐ ┌──▼────┐ ┌──▼────┐ ┌──▼──────┐
│PostgreSQL│ │Redis  │ │MongoDB│ │S3/MinIO │
│Core Data│ │Cache  │ │Flexible│ │Images   │
│Users    │ │Sessions│ │Attributes│ │Files   │
│Trans.   │ │Queues │ │Analytics│ │Backups  │
└─────────┘ └───────┘ └────────┘ └──────────┘
```

## Deployment Architecture for Ubuntu

### Docker Compose Setup (Development/Staging)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_DB: carddb
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPL_PASSWORD}
    volumes:
      - ./postgres-primary:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - carddb-net

  postgres-replica1:
    image: postgres:15
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: postgres-primary
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPL_PASSWORD}
    depends_on:
      - postgres-primary
    networks:
      - carddb-net

  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres-primary
      DATABASES_PORT: 5432
      DATABASES_DBNAME: carddb
      POOL_MODE: transaction
    ports:
      - "6432:5432"
    depends_on:
      - postgres-primary
      - postgres-replica1
    networks:
      - carddb-net

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - ./redis-data:/data
    networks:
      - carddb-net

networks:
  carddb-net:
    driver: bridge
```

### Kubernetes Setup (Production)

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-primary
spec:
  serviceName: postgres-primary
  replicas: 1
  selector:
    matchLabels:
      app: postgres-primary
  template:
    metadata:
      labels:
        app: postgres-primary
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: carddb
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Monitoring & Maintenance

### Essential Monitoring Setup

```bash
# Install monitoring stack
sudo apt update
sudo apt install prometheus grafana postgresql-15-pg-stat-statements

# PostgreSQL monitoring queries
-- Connection monitoring
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;

-- Slow query identification
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Replication lag monitoring
SELECT client_addr, state, sync_priority, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS lag_bytes
FROM pg_stat_replication;
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Run daily via cron

# Configuration
BACKUP_DIR="/backup/postgres"
DB_NAME="carddb"
DATE=$(date +%Y%m%d_%H%M%S)

# Perform backup
pg_dump -h localhost -U postgres -d $DB_NAME -Fc -f "$BACKUP_DIR/carddb_$DATE.dump"

# Upload to S3
aws s3 cp "$BACKUP_DIR/carddb_$DATE.dump" s3://carddb-backups/

# Keep only last 7 days locally
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete

# WAL archiving for point-in-time recovery
archive_command = 'test ! -f /backup/wal/%f && cp %p /backup/wal/%f'
```

## Scaling Decision Tree

```
Start Here
    │
    ├─ < 10K users, < 100 GB data
    │   └─> Single PostgreSQL + Redis Cache
    │
    ├─ 10K-100K users, 100GB-1TB data
    │   └─> PostgreSQL Primary + 2-3 Read Replicas + Redis
    │
    ├─ 100K-1M users, 1-10TB data
    │   └─> PostgreSQL + Citus Sharding + Redis Cluster
    │
    └─ > 1M users, > 10TB data
        └─> Consider: 
            - Vitess (YouTube's solution)
            - CockroachDB (Distributed SQL)
            - Custom sharding solution
```

## Performance Tuning

### PostgreSQL Configuration for CardDB

```ini
# postgresql.conf optimizations for card database

# Memory (for 64GB RAM server)
shared_buffers = 16GB
effective_cache_size = 48GB
maintenance_work_mem = 2GB
work_mem = 32MB

# Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # For SSD

# Parallel Query
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Connection Pooling
max_connections = 200  # Use PgBouncer for more
```

### Application-Level Optimizations

```python
# connection_pool.py
from psycopg2 import pool
from contextlib import contextmanager

class DatabasePool:
    def __init__(self):
        self.pool = pool.ThreadedConnectionPool(
            minconn=5,
            maxconn=20,
            host="localhost",
            database="carddb",
            user="app_user",
            password="secure_password"
        )
    
    @contextmanager
    def get_connection(self):
        connection = self.pool.getconn()
        try:
            yield connection
            connection.commit()
        except:
            connection.rollback()
            raise
        finally:
            self.pool.putconn(connection)

# Usage
db_pool = DatabasePool()

with db_pool.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cards WHERE year = %s", (2023,))
    results = cursor.fetchall()
```

## Migration Path

### Phase 1: Current State (SQLite)
- Export data using pg_dump equivalent
- Prepare PostgreSQL schema

### Phase 2: Single PostgreSQL Instance
```bash
# Migrate from SQLite to PostgreSQL
python migrate_sqlite_to_postgres.py

# Test application with PostgreSQL
./run_tests.sh
```

### Phase 3: Add Replication
```bash
# Set up streaming replication
pg_basebackup -h primary_host -D /var/lib/postgresql/data -U replicator -W -P -R
```

### Phase 4: Add Caching Layer
```bash
# Install Redis
sudo apt install redis-server
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Phase 5: Horizontal Scaling (if needed)
- Implement Citus or custom sharding
- Partition large tables by tenant_id or date

## Cost Estimation (AWS/DigitalOcean)

### Small Scale (< 10K users)
- 1x Database Server (4 vCPU, 8GB RAM): $40-80/month
- 1x Redis Cache (2GB): $15-25/month
- Storage (100GB SSD): $10-20/month
- **Total: ~$65-125/month**

### Medium Scale (10K-100K users)
- 1x Primary DB (8 vCPU, 32GB RAM): $160-320/month
- 2x Read Replicas (4 vCPU, 16GB RAM each): $160-320/month
- 1x Redis Cluster (8GB): $50-100/month
- Storage (500GB SSD): $50-100/month
- Load Balancer: $20-40/month
- **Total: ~$440-880/month**

### Large Scale (100K-1M users)
- Database Cluster (Citus/RDS): $1000-3000/month
- Redis Cluster: $200-500/month
- CDN for images: $100-500/month
- **Total: ~$1300-4000/month**

## Security Considerations

```bash
# Database security checklist
✓ Use SSL/TLS for all connections
✓ Implement Row Level Security (RLS)
✓ Regular security updates
✓ Encrypted backups
✓ Separate read/write database users
✓ Network isolation (VPC/Private Network)
✓ Audit logging enabled
✓ Regular penetration testing
```

## Next Steps

1. **Immediate Actions:**
   - Set up PostgreSQL development environment
   - Migrate schema from SQLite to PostgreSQL
   - Implement connection pooling

2. **Short Term (1-3 months):**
   - Add Redis caching layer
   - Set up monitoring with Grafana
   - Implement automated backups

3. **Medium Term (3-6 months):**
   - Add read replicas
   - Implement horizontal scaling strategy
   - Performance testing and optimization

4. **Long Term (6+ months):**
   - Evaluate need for sharding
   - Consider managed database services
   - Implement disaster recovery plan
