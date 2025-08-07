// Color utility functions for team color handling

export interface TeamColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export interface TeamColorScheme {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

// Default color scheme for teams without colors
export const DEFAULT_COLORS: TeamColorScheme = {
  primary_color: '#3b82f6',    // Blue-500
  secondary_color: '#ffffff',   // White
  accent_color: '#06b6d4'      // Cyan-500
};

// Alternative color schemes that can be randomly assigned
export const FALLBACK_COLOR_SCHEMES: TeamColorScheme[] = [
  { primary_color: '#3b82f6', secondary_color: '#ffffff', accent_color: '#06b6d4' }, // Blue
  { primary_color: '#ef4444', secondary_color: '#ffffff', accent_color: '#f97316' }, // Red
  { primary_color: '#10b981', secondary_color: '#ffffff', accent_color: '#059669' }, // Green
  { primary_color: '#8b5cf6', secondary_color: '#ffffff', accent_color: '#7c3aed' }, // Purple
  { primary_color: '#f59e0b', secondary_color: '#000000', accent_color: '#d97706' }, // Orange
  { primary_color: '#06b6d4', secondary_color: '#ffffff', accent_color: '#0891b2' }, // Cyan
  { primary_color: '#ec4899', secondary_color: '#ffffff', accent_color: '#db2777' }, // Pink
  { primary_color: '#84cc16', secondary_color: '#000000', accent_color: '#65a30d' }, // Lime
];

/**
 * Get logo colors from team data with fallbacks
 */
export function getTeamLogoColors(team?: TeamColorScheme | null): TeamColors {
  if (team?.primary_color && team?.secondary_color) {
    return {
      backgroundColor: team.primary_color,
      borderColor: team.secondary_color,
      textColor: getContrastColor(team.primary_color)
    };
  }
  
  // Return default colors
  return {
    backgroundColor: DEFAULT_COLORS.primary_color!,
    borderColor: DEFAULT_COLORS.secondary_color!,
    textColor: '#ffffff'
  };
}

/**
 * Determine if a color is light or dark to choose appropriate text color
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get a random color scheme for teams without assigned colors
 */
export function getRandomColorScheme(teamId?: number): TeamColorScheme {
  if (teamId) {
    // Use team ID to consistently assign the same "random" color
    const index = teamId % FALLBACK_COLOR_SCHEMES.length;
    return FALLBACK_COLOR_SCHEMES[index];
  }
  
  // Truly random for new teams without IDs
  const randomIndex = Math.floor(Math.random() * FALLBACK_COLOR_SCHEMES.length);
  return FALLBACK_COLOR_SCHEMES[randomIndex];
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Sanitize color input - ensures valid hex format or returns default
 */
export function sanitizeColor(color: string | undefined, defaultColor: string): string {
  if (!color) return defaultColor;
  
  // Add # if missing
  const sanitized = color.startsWith('#') ? color : `#${color}`;
  
  return isValidHexColor(sanitized) ? sanitized : defaultColor;
}

/**
 * Get team colors with comprehensive fallback handling
 */
export function getTeamColorsWithFallback(team?: TeamColorScheme | null, teamId?: number): TeamColorScheme {
  const colors: TeamColorScheme = {};
  
  if (team) {
    colors.primary_color = sanitizeColor(team.primary_color, DEFAULT_COLORS.primary_color!);
    colors.secondary_color = sanitizeColor(team.secondary_color, DEFAULT_COLORS.secondary_color!);
    colors.accent_color = sanitizeColor(team.accent_color, DEFAULT_COLORS.accent_color!);
  } else {
    // No team data - assign random colors based on team ID
    return getRandomColorScheme(teamId);
  }
  
  return colors;
}