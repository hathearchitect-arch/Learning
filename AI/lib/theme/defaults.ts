interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
  destructive: string;
  destructiveForeground: string;
  // Card colors
  card: string;
  cardForeground: string;
  // Input colors
  input: string;
  // Sidebar colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  // UI colors
  inputRing: string;
  primaryFontColor: string;
  cursorColor: string;
  // Font settings
  headingFont?: string;
  bodyFont?: string;
  fontSize?: string;
}

interface FontSettings {
  headingFont: string;
  bodyFont: string;
  fontSize: string;
}

type ThemeMode = 'light' | 'dark';

interface AgentTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  fonts: FontSettings;
}

const defaultFontSettings: FontSettings = {
  headingFont: '"Inter", sans-serif',
  bodyFont: '"Inter", sans-serif',
  fontSize: '16px',
};

// Create theme colors for both modes
const defaultLightThemeColors: ThemeColors = {
  primary: '240 5.9% 10%',
  primaryForeground: '0 0% 98%',
  secondary: '240 4.8% 95.9%',
  secondaryForeground: '240 5.9% 10%',
  background: '0 0% 100%',
  foreground: '240 10% 3.9%',
  muted: '240 4.8% 95.9%',
  accent: '240 4.8% 95.9%',
  border: '240 5.9% 90%',
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '0 0% 98%',
  card: '0 0% 100%',
  cardForeground: '240 10% 3.9%',
  input: '240 5.9% 90%',
  sidebarBackground: '0 0% 98%',
  sidebarForeground: '240 5.3% 26.1%',
  sidebarPrimary: '240 5.9% 10%',
  sidebarPrimaryForeground: '0 0% 98%',
  sidebarAccent: '240 4.8% 95.9%',
  sidebarAccentForeground: '240 5.9% 10%',
  sidebarBorder: '220 13% 91%',
  sidebarRing: '217.2 91.2% 59.8%',
  inputRing: '240 10% 3.9%',
  primaryFontColor: '240 10% 3.9%',
  cursorColor: '240 5.9% 10%',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  fontSize: '16px',
};

const defaultDarkThemeColors: ThemeColors = {
  primary: '0 0% 98%',
  primaryForeground: '240 5.9% 10%',
  secondary: '240 3.7% 15.9%',
  secondaryForeground: '0 0% 98%',
  background: '240 10% 3.9%',
  foreground: '0 0% 98%',
  muted: '240 3.7% 15.9%',
  accent: '240 3.7% 15.9%',
  border: '240 3.7% 15.9%',
  destructive: '0 62.8% 30.6%',
  destructiveForeground: '0 0% 98%',
  card: '240 10% 3.9%',
  cardForeground: '0 0% 98%',
  input: '240 3.7% 15.9%',
  sidebarBackground: '240 5.9% 10%',
  sidebarForeground: '240 4.8% 95.9%',
  sidebarPrimary: '224.3 76.3% 48%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: '240 3.7% 15.9%',
  sidebarAccentForeground: '240 4.8% 95.9%',
  sidebarBorder: '240 3.7% 15.9%',
  sidebarRing: '217.2 91.2% 59.8%',
  inputRing: '240 4.9% 83.9%',
  primaryFontColor: '0 0% 98%',
  cursorColor: '0 0% 98%',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  fontSize: '16px',
};

export type { ThemeColors, FontSettings, ThemeMode, AgentTheme };

// Export the defaults and utility functions
export { defaultFontSettings, defaultLightThemeColors, defaultDarkThemeColors };
