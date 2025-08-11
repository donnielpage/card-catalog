-- SQLite database schema for card database

-- Create manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    year INTEGER,
    subsetname TEXT
);

-- Create teams table with color support
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    mascot TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    dob DATE
);

-- Create cards table with foreign key relationships
CREATE TABLE IF NOT EXISTS cards (
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

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
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

-- Create sessions table for NextAuth
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_playerid ON cards(playerid);
CREATE INDEX IF NOT EXISTS idx_cards_teamid ON cards(teamid);
CREATE INDEX IF NOT EXISTS idx_cards_manufacturerid ON cards(manufacturerid);
CREATE INDEX IF NOT EXISTS idx_cards_year ON cards(year);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);