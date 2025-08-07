-- Update existing teams without colors to have default colors
-- This ensures backward compatibility with teams created before color support

UPDATE teams 
SET 
  primary_color = CASE 
    WHEN primary_color IS NULL OR primary_color = '' THEN 
      CASE 
        WHEN id % 8 = 0 THEN '#3b82f6'  -- Blue
        WHEN id % 8 = 1 THEN '#ef4444'  -- Red  
        WHEN id % 8 = 2 THEN '#10b981'  -- Green
        WHEN id % 8 = 3 THEN '#8b5cf6'  -- Purple
        WHEN id % 8 = 4 THEN '#f59e0b'  -- Orange
        WHEN id % 8 = 5 THEN '#06b6d4'  -- Cyan
        WHEN id % 8 = 6 THEN '#ec4899'  -- Pink
        ELSE '#84cc16'  -- Lime
      END
    ELSE primary_color
  END,
  secondary_color = CASE 
    WHEN secondary_color IS NULL OR secondary_color = '' THEN 
      CASE 
        WHEN (id % 8) IN (4, 7) THEN '#000000'  -- Black text for orange/lime
        ELSE '#ffffff'  -- White text for others
      END
    ELSE secondary_color
  END,
  accent_color = CASE 
    WHEN accent_color IS NULL OR accent_color = '' THEN 
      CASE 
        WHEN id % 8 = 0 THEN '#06b6d4'  -- Cyan
        WHEN id % 8 = 1 THEN '#f97316'  -- Orange-red
        WHEN id % 8 = 2 THEN '#059669'  -- Green-600
        WHEN id % 8 = 3 THEN '#7c3aed'  -- Purple-600
        WHEN id % 8 = 4 THEN '#d97706'  -- Orange-600
        WHEN id % 8 = 5 THEN '#0891b2'  -- Cyan-600
        WHEN id % 8 = 6 THEN '#db2777'  -- Pink-600
        ELSE '#65a30d'  -- Lime-600
      END
    ELSE accent_color
  END
WHERE 
  primary_color IS NULL OR primary_color = '' OR
  secondary_color IS NULL OR secondary_color = '' OR  
  accent_color IS NULL OR accent_color = '';

-- Show updated teams
SELECT id, city, mascot, primary_color, secondary_color, accent_color 
FROM teams 
ORDER BY id;