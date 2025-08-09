-- Insert sample manufacturers
INSERT INTO manufacturers (company, year, subsetname) VALUES 
('Topps', 1991, 'Stadium Club'),
('Upper Deck', 1989, 'Standard'),
('Panini', 2009, 'Donruss'),
('Bowman', 1948, 'Rookie Cards');

-- Insert all MLB teams with official colors
-- Complete set of 30 MLB teams organized by division

-- National League East
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Atlanta', 'Braves', '#ce1141', '#13274f', '#eaaa00');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Miami', 'Marlins', '#ff6600', '#0077c8', '#ffd100');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('New York', 'Mets', '#002f6c', '#ffa500', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Philadelphia', 'Phillies', '#e81828', '#002d72', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Washington', 'Nationals', '#ab0003', '#14225a', '#FFFFFF');

-- National League Central  
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Chicago', 'Cubs', '#0e3386', '#cc3433', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Cincinnati', 'Reds', '#c6011f', '#000000', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Milwaukee', 'Brewers', '#0a2351', '#b6922e', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Pittsburgh', 'Pirates', '#000000', '#fdb827', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('St. Louis', 'Cardinals', '#c41e3a', '#0c2340', '#ffd200');

-- National League West
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Arizona', 'Diamondbacks', '#a71930', '#e3d4ad', '#000000');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Colorado', 'Rockies', '#33006f', '#c4ced4', '#000000');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Los Angeles', 'Dodgers', '#005a9c', '#c4ced4', '#ef3e42');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('San Diego', 'Padres', '#0c2340', '#ffc62f', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('San Francisco', 'Giants', '#fd5a1e', '#000000', '#c4ced4');

-- American League East
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Baltimore', 'Orioles', '#df4601', '#000000', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Boston', 'Red Sox', '#bd3039', '#192c55', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('New York', 'Yankees', '#0c2340', '#ffffff', '#c4ced4');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Tampa Bay', 'Rays', '#092c5c', '#8fbce6', '#f5d130');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Toronto', 'Blue Jays', '#134a8e', '#1d2d5c', '#e8291c');

-- American League Central
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Chicago', 'White Sox', '#000000', '#c4ced4', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Cleveland', 'Guardians', '#00385d', '#e50022', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Detroit', 'Tigers', '#182d55', '#f26722', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Kansas City', 'Royals', '#174885', '#c0995a', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Minnesota', 'Twins', '#002b5c', '#d31145', '#cfac7a');

-- American League West
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Houston', 'Astros', '#002d62', '#eb6e1f', '#e7e9ea');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Los Angeles', 'Angels', '#ba0021', '#003263', '#FFFFFF');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Oakland', 'Athletics', '#003831', '#ebb742', '#c4ced4');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Seattle', 'Mariners', '#0c2c56', '#005c5c', '#d50032');
INSERT INTO teams (city, mascot, primary_color, secondary_color, accent_color) VALUES ('Texas', 'Rangers', '#003278', '#c0111f', '#FFFFFF');

-- Insert sample players
INSERT INTO players (firstname, lastname, dob) VALUES 
('Derek', 'Jeter', '1974-06-26'),
('Ted', 'Williams', '1918-08-30'),
('Babe', 'Ruth', '1895-02-06'),
('Mickey', 'Mantle', '1931-10-20'),
('Willie', 'Mays', '1931-05-06');

-- Insert sample cards
INSERT INTO cards (cardnumber, playerid, teamid, manufacturerid, year, condition, notes) VALUES 
('2', 1, 35, 1, 1993, 'Near Mint', 'Derek Jeter rookie card in excellent condition'),
('23', 2, 34, 2, 1941, 'Very Good', 'Classic Ted Williams card'),
('3', 3, 1, 1, 1927, 'Good', 'Vintage Babe Ruth card - some wear'),
('7', 4, 1, 1, 1952, 'Excellent', 'Mickey Mantle rookie year'),
('24', 5, 5, 2, 1951, 'Near Mint', 'Say Hey Kid rookie card');

-- Admin user is created during installation with custom password