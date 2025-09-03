-- PostgreSQL multi-tenant schema for CardVault

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table (already created above, but included for completeness)
-- CREATE TABLE IF NOT EXISTS tenants (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name VARCHAR(255) NOT NULL,
--   slug VARCHAR(100) UNIQUE NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW(),
--   subscription_tier VARCHAR(50) DEFAULT 'starter',
--   max_users INTEGER DEFAULT 5,
--   database_name VARCHAR(100) UNIQUE,
--   status VARCHAR(20) DEFAULT 'active'
-- );

-- Create manufacturers table with tenant isolation
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company TEXT NOT NULL,
    year INTEGER,
    subsetname TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create teams table with tenant isolation
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    city TEXT NOT NULL,
    mascot TEXT,
    teamname TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create players table with tenant isolation
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    dob DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create cards table with tenant isolation and foreign key relationships
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    cardnumber TEXT NOT NULL,
    playerid UUID REFERENCES players(id),
    teamid UUID REFERENCES teams(id),
    manufacturerid UUID REFERENCES manufacturers(id),
    year INTEGER,
    imageurl TEXT,
    condition TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create users table with tenant isolation
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    firstname TEXT,
    lastname TEXT,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    tenant_role VARCHAR(50) DEFAULT 'user',
    permissions JSONB DEFAULT '{}',
    favorite_team_id UUID REFERENCES teams(id),
    favorite_player_id UUID REFERENCES players(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, username),
    UNIQUE(tenant_id, email)
);

-- Create tenant-aware indexes for performance
CREATE INDEX idx_manufacturers_tenant ON manufacturers(tenant_id);
CREATE INDEX idx_teams_tenant ON teams(tenant_id);
CREATE INDEX idx_players_tenant ON players(tenant_id);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Performance indexes
CREATE INDEX idx_cards_tenant_year ON cards(tenant_id, year);
CREATE INDEX idx_cards_tenant_player ON cards(tenant_id, playerid);
CREATE INDEX idx_cards_tenant_team ON cards(tenant_id, teamid);
CREATE INDEX idx_cards_tenant_manufacturer ON cards(tenant_id, manufacturerid);

-- Row Level Security (RLS) for tenant isolation
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (these will be activated when we implement the connection context)
-- CREATE POLICY manufacturers_tenant_policy ON manufacturers 
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
-- CREATE POLICY teams_tenant_policy ON teams 
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
-- CREATE POLICY players_tenant_policy ON players 
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
-- CREATE POLICY cards_tenant_policy ON cards 
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
-- CREATE POLICY users_tenant_policy ON users 
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);