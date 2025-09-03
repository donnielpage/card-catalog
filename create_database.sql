-- SQLite database schema for card database

-- Create manufacturers table
CREATE TABLE manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    year INTEGER,
    subsetname TEXT
);

-- Create teams table  
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    mascot TEXT,
    teamname TEXT NOT NULL
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

-- Create indexes for better performance
CREATE INDEX idx_cards_playerid ON cards(playerid);
CREATE INDEX idx_cards_teamid ON cards(teamid);
CREATE INDEX idx_cards_manufacturerid ON cards(manufacturerid);
CREATE INDEX idx_cards_year ON cards(year);