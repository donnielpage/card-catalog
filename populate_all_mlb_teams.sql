-- Complete MLB Teams Population Script with Official Colors
-- Based on official team color data from multiple sources

-- Clear existing teams data and reset auto-increment
DELETE FROM teams;
DELETE FROM sqlite_sequence WHERE name='teams';

-- Insert all 30 MLB teams with official colors
-- Format: city, mascot, primary_color, secondary_color, accent_color

INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES
-- National League East
('Atlanta', 'Braves', '#ce1141', '#13274f', '#eaaa00'),
('Miami', 'Marlins', '#ff6600', '#0077c8', '#ffd100'),
('New York', 'Mets', '#002f6c', '#ffa500', '#FFFFFF'),
('Philadelphia', 'Phillies', '#e81828', '#002d72', '#FFFFFF'),
('Washington', 'Nationals', '#ab0003', '#14225a', '#FFFFFF'),

-- National League Central  
('Chicago', 'Cubs', '#0e3386', '#cc3433', '#FFFFFF'),
('Cincinnati', 'Reds', '#c6011f', '#000000', '#FFFFFF'),
('Milwaukee', 'Brewers', '#0a2351', '#b6922e', '#FFFFFF'),
('Pittsburgh', 'Pirates', '#000000', '#fdb827', '#FFFFFF'),
('St. Louis', 'Cardinals', '#c41e3a', '#0c2340', '#ffd200'),

-- National League West
('Arizona', 'Diamondbacks', '#a71930', '#e3d4ad', '#000000'),
('Colorado', 'Rockies', '#33006f', '#c4ced4', '#000000'),
('Los Angeles', 'Dodgers', '#005a9c', '#c4ced4', '#ef3e42'),
('San Diego', 'Padres', '#0c2340', '#ffc62f', '#FFFFFF'),
('San Francisco', 'Giants', '#fd5a1e', '#000000', '#c4ced4'),

-- American League East
('Baltimore', 'Orioles', '#df4601', '#000000', '#FFFFFF'),
('Boston', 'Red Sox', '#bd3039', '#192c55', '#FFFFFF'),
('New York', 'Yankees', '#0c2340', '#ffffff', '#c4ced4'),
('Tampa Bay', 'Rays', '#092c5c', '#8fbce6', '#f5d130'),
('Toronto', 'Blue Jays', '#134a8e', '#1d2d5c', '#e8291c'),

-- American League Central
('Chicago', 'White Sox', '#000000', '#c4ced4', '#FFFFFF'),
('Cleveland', 'Guardians', '#00385d', '#e50022', '#FFFFFF'),
('Detroit', 'Tigers', '#182d55', '#f26722', '#FFFFFF'),
('Kansas City', 'Royals', '#174885', '#c0995a', '#FFFFFF'),
('Minnesota', 'Twins', '#002b5c', '#d31145', '#cfac7a'),

-- American League West
('Houston', 'Astros', '#002d62', '#eb6e1f', '#e7e9ea'),
('Los Angeles', 'Angels', '#ba0021', '#003263', '#FFFFFF'),
('Oakland', 'Athletics', '#003831', '#ebb742', '#c4ced4'),
('Seattle', 'Mariners', '#0c2c56', '#005c5c', '#d50032'),
('Texas', 'Rangers', '#003278', '#c0111f', '#FFFFFF');