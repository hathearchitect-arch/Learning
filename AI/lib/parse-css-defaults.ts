// This would normally read from the actual global.css file
// For this implementation, we'll extract the values from the CSS content
export function parseCSSDefaults(): Record<string, string> {
  // In a real implementation, you would read the global.css file
  // For now, we'll extract the current values from the CSS
  const cssContent = `
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 222.2 84% 4.9%;
      --radius: 0.5rem;
      --font-heading: Inter, sans-serif;
      --font-body: Inter, sans-serif;
      --font-size: 16px;
      --input-ring: 222.2 84% 4.9%;
      --primary-font-color: 222.2 84% 4.9%;
      --cursor-color: 222.2 84% 4.9%;
      --sidebar-width: 16rem;
      --sidebar-width-icon: 3rem;
      --sidebar-background: 0 0% 98%;
      --sidebar-foreground: 240 5.3% 26.1%;
      --sidebar-primary: 240 5.9% 10%;
      --sidebar-primary-foreground: 0 0% 98%;
      --sidebar-accent: 240 4.8% 95.9%;
      --sidebar-accent-foreground: 240 5.9% 10%;
      --sidebar-border: 220 13% 91%;
      --sidebar-ring: 217.2 91.2% 59.8%;
    }
  `;

  const defaults: Record<string, string> = {};

  // Parse CSS variables from the content
  const cssVariableRegex = /--([a-zA-Z-]+):\s*([^;]+);/g;
  let match;

  while ((match = cssVariableRegex.exec(cssContent)) !== null) {
    const [, property, value] = match;
    defaults[property] = value.trim();
  }

  return defaults;
}

// Map CSS variable names to our theme property names
export function mapCSSToThemeProperties(): Record<string, string> {
  return {
    primary: 'primary',
    secondary: 'secondary',
    'secondary-foreground': 'secondaryForeground',
    background: 'background',
    foreground: 'foreground',
    muted: 'muted',
    accent: 'accent',
    border: 'border',
    destructive: 'destructive',
    card: 'card',
    'card-foreground': 'cardForeground',
    input: 'input',
    'sidebar-background': 'sidebarBackground',
    'sidebar-foreground': 'sidebarForeground',
    'sidebar-primary': 'sidebarPrimary',
    'sidebar-primary-foreground': 'sidebarPrimaryForeground',
    'sidebar-accent': 'sidebarAccent',
    'sidebar-accent-foreground': 'sidebarAccentForeground',
    'sidebar-border': 'sidebarBorder',
    'sidebar-ring': 'sidebarRing',
    'input-ring': 'inputRing',
    'primary-font-color': 'primaryFontColor',
    'cursor-color': 'cursorColor',
  };
}

// Map CSS variable names to our font property names
export function mapCSSToFontProperties(): Record<string, string> {
  return {
    'font-heading': 'headingFont',
    'font-body': 'bodyFont',
    'font-size': 'fontSize',
  };
}

// Generate default theme colors from CSS
export function generateDefaultThemeColors(): Record<string, string> {
  const cssDefaults = parseCSSDefaults();
  const propertyMap = mapCSSToThemeProperties();
  const themeDefaults: Record<string, string> = {};

  Object.entries(propertyMap).forEach(([cssVar, themeProperty]) => {
    if (cssDefaults[cssVar]) {
      themeDefaults[themeProperty] = cssDefaults[cssVar];
    }
  });

  return themeDefaults;
}

// Generate default font settings from CSS
export function generateDefaultFontSettings(): Record<string, string> {
  const cssDefaults = parseCSSDefaults();
  const propertyMap = mapCSSToFontProperties();
  const fontDefaults: Record<string, string> = {};

  Object.entries(propertyMap).forEach(([cssVar, fontProperty]) => {
    if (cssDefaults[cssVar]) {
      fontDefaults[fontProperty] = cssDefaults[cssVar];
    }
  });

  return fontDefaults;
}
