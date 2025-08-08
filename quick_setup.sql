-- Quick setup script for development

-- Create manufacturers table
CREATE TABLE manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    year INTEGER,
    subsetname TEXT
);

-- Create teams table with color support
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

-- Create cards table with foreign key relationships
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

-- Create users table for authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'manager', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table for NextAuth
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_cards_playerid ON cards(playerid);
CREATE INDEX idx_cards_teamid ON cards(teamid);
CREATE INDEX idx_cards_manufacturerid ON cards(manufacturerid);
CREATE INDEX idx_cards_year ON cards(year);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Add some basic sample data
INSERT INTO manufacturers (company, year, subsetname) VALUES 
('Topps', 1991, 'Stadium Club'),
('Upper Deck', 1989, 'Standard');

-- Add key teams with colors
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Boston', 'Red Sox', '#bd3039', '#192c55', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('New York', 'Yankees', '#0c2340', '#ffffff', '#c4ced4');

-- Add sample players
INSERT INTO players (firstname, lastname, dob) VALUES 
('Derek', 'Jeter', '1974-06-26'),
('Ted', 'Williams', '1918-08-30');

-- Add sample cards
INSERT INTO cards (cardnumber, playerid, teamid, manufacturerid, year, condition, notes) VALUES 
('2', 1, 2, 1, 1993, 'Near Mint', 'Derek Jeter rookie card'),
('23', 2, 1, 2, 1941, 'Very Good', 'Classic Ted Williams card');

-- Add admin user only (ignore if already exists)
INSERT OR IGNORE INTO users (username, email, firstname, lastname, password_hash, role) VALUES ('admin', 'admin@cardvault.com', 'Admin', 'User', '$2b$12$lObinT/d5hSSaiiiRDMSt.my82WpG8fE7BT22dUjNHeIY3H6LraCi', 'admin');