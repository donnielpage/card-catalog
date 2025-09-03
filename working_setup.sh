#!/bin/bash

# Create CardVault database with working admin login

# Initialize database
sqlite3 carddb.sqlite << 'EOF'

-- Create users table with firstname/lastname support
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'manager', 'admin')),
    favorite_team_id INTEGER,
    favorite_player_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table with colors
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    mascot TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT
);

-- Create players table
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    dob DATE
);

-- Create manufacturers table
CREATE TABLE manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    year INTEGER,
    subsetname TEXT
);

-- Create cards table
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cardnumber TEXT NOT NULL,
    playerid INTEGER,
    teamid INTEGER,
    manufacturerid INTEGER,
    year INTEGER,
    imageurl TEXT,
    condition TEXT,
    notes TEXT,
    FOREIGN KEY (playerid) REFERENCES players(id),
    FOREIGN KEY (teamid) REFERENCES teams(id),
    FOREIGN KEY (manufacturerid) REFERENCES manufacturers(id)
);

-- Create sessions table for NextAuth
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert admin user (password: password123)
INSERT INTO users (username, email, firstname, lastname, password_hash, role) 
VALUES ('admin', 'admin@cardvault.com', 'Admin', 'User', '$2b$12$lObinT/d5hSSaiiiRDMSt.my82WpG8fE7BT22dUjNHeIY3H6LraCi', 'admin');

-- Insert test user (password: password123)  
INSERT INTO users (username, email, firstname, lastname, password_hash, role)
VALUES ('test', 'test@cardvault.com', 'Test', 'User', '$2b$12$lObinT/d5hSSaiiiRDMSt.my82WpG8fE7BT22dUjNHeIY3H6LraCi', 'user');

-- Insert key teams with colors
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Boston', 'Red Sox', '#bd3039', '#192c55', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('New York', 'Yankees', '#0c2340', '#ffffff', '#c4ced4');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Chicago', 'Cubs', '#0e3386', '#cc3433', '#FFFFFF');

-- Insert sample players
INSERT INTO players (firstname, lastname, dob) VALUES ('Ted', 'Williams', '1918-08-30');
INSERT INTO players (firstname, lastname, dob) VALUES ('Derek', 'Jeter', '1974-06-26');

-- Insert manufacturers
INSERT INTO manufacturers (company, year, subsetname) VALUES ('Topps', 1991, 'Stadium Club');
INSERT INTO manufacturers (company, year, subsetname) VALUES ('Upper Deck', 1989, 'Standard');

-- Insert sample card
INSERT INTO cards (cardnumber, playerid, teamid, manufacturerid, year, condition, notes) 
VALUES ('23', 1, 1, 2, 1941, 'Very Good', 'Classic Ted Williams card');

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

EOF

echo "Database created successfully!"
echo "Admin login: username=admin, password=password123"