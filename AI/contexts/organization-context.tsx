'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  generateDefaultThemeColors,
  generateDefaultFontSettings,
} from '@/lib/parse-css-defaults';

interface ThemeColors {
  primary: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
  destructive: string;
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
}

interface FontSettings {
  headingFont: string;
  bodyFont: string;
  fontSize: string;
}

interface Organization {
  id: string;
  name: string;
  logo?: string;
  welcomeMessage?: string;
  companyName: string;
  theme?: ThemeColors;
  fonts?: FontSettings;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  switchOrganization: (orgId: string) => void;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  applyTheme: (theme: ThemeColors) => void;
  applyFonts: (fonts: FontSettings) => void;
}

// Generate defaults from CSS
const cssThemeDefaults = generateDefaultThemeColors();
const cssFontDefaults = generateDefaultFontSettings();

const defaultThemeColors: ThemeColors = {
  primary: cssThemeDefaults.primary || '222.2 84% 4.9%',
  secondary: cssThemeDefaults.secondary || '210 40% 96%',
  secondaryForeground:
    cssThemeDefaults.secondaryForeground || '222.2 47.4% 11.2%',
  background: cssThemeDefaults.background || '0 0% 100%',
  foreground: cssThemeDefaults.foreground || '222.2 84% 4.9%',
  muted: cssThemeDefaults.muted || '210 40% 96%',
  accent: cssThemeDefaults.accent || '210 40% 96%',
  border: cssThemeDefaults.border || '214.3 31.8% 91.4%',
  destructive: cssThemeDefaults.destructive || '0 84.2% 60.2%',
  // Card colors
  card: cssThemeDefaults.card || '0 0% 100%',
  cardForeground: cssThemeDefaults.cardForeground || '222.2 84% 4.9%',
  // Input colors
  input: cssThemeDefaults.input || '214.3 31.8% 91.4%',
  // Sidebar colors
  sidebarBackground: cssThemeDefaults.sidebarBackground || '0 0% 98%',
  sidebarForeground: cssThemeDefaults.sidebarForeground || '240 5.3% 26.1%',
  sidebarPrimary: cssThemeDefaults.sidebarPrimary || '240 5.9% 10%',
  sidebarPrimaryForeground:
    cssThemeDefaults.sidebarPrimaryForeground || '0 0% 98%',
  sidebarAccent: cssThemeDefaults.sidebarAccent || '240 4.8% 95.9%',
  sidebarAccentForeground:
    cssThemeDefaults.sidebarAccentForeground || '240 5.9% 10%',
  sidebarBorder: cssThemeDefaults.sidebarBorder || '220 13% 91%',
  sidebarRing: cssThemeDefaults.sidebarRing || '217.2 91.2% 59.8%',
  // UI colors
  inputRing: cssThemeDefaults.inputRing || '222.2 84% 4.9%',
  primaryFontColor: cssThemeDefaults.primaryFontColor || '222.2 84% 4.9%',
  cursorColor: cssThemeDefaults.cursorColor || '222.2 84% 4.9%',
};

const defaultFontSettings: FontSettings = {
  headingFont: cssFontDefaults.headingFont || '"Inter", sans-serif',
  bodyFont: cssFontDefaults.bodyFont || '"Inter", sans-serif',
  fontSize: cssFontDefaults.fontSize || '16px',
};

const defaultOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Acme Corp',
    welcomeMessage: 'Connect to Everything. Ask for Anything.',
    companyName: 'Acme Corp',
    theme: defaultThemeColors,
    fonts: defaultFontSettings,
  },
  {
    id: 'org-2',
    name: 'TechStart Inc',
    logo: '/placeholder.svg?height=60&width=60',
    welcomeMessage: 'Welcome to TechStart! Ready to innovate?',
    companyName: 'TechStart Inc',
    theme: {
      ...defaultThemeColors,
      primary: '142.1 76.2% 36.3%',
      secondaryForeground: '142.1 76.2% 20%',
      cardForeground: '142.1 76.2% 20%',
      sidebarPrimary: '142.1 76.2% 36.3%',
      inputRing: '142.1 76.2% 36.3%',
      primaryFontColor: '142.1 76.2% 36.3%',
      cursorColor: '142.1 76.2% 36.3%',
    },
    fonts: { ...defaultFontSettings, headingFont: '"Poppins", sans-serif' },
  },
  {
    id: 'org-3',
    name: 'Global Solutions',
    logo: '/placeholder.svg?height=60&width=60',
    welcomeMessage: 'Welcome to Global Solutions. Your success is our mission.',
    companyName: 'Global Solutions',
    theme: {
      ...defaultThemeColors,
      primary: '221.2 83.2% 53.3%',
      secondaryForeground: '221.2 83.2% 25%',
      cardForeground: '221.2 83.2% 25%',
      sidebarBackground: '221.2 83.2% 98%',
      sidebarPrimary: '221.2 83.2% 53.3%',
      inputRing: '221.2 83.2% 53.3%',
      primaryFontColor: '221.2 83.2% 53.3%',
      cursorColor: '221.2 83.2% 53.3%',
    },
    fonts: { ...defaultFontSettings, bodyFont: '"Roboto", sans-serif' },
  },
];

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({
  children,
}: { children: React.ReactNode }) {
  const [organizations, setOrganizations] =
    useState<Organization[]>(defaultOrganizations);
  const [currentOrganization, setCurrentOrganization] =
    useState<Organization | null>(null);

  // Load current organization from localStorage on mount
  useEffect(() => {
    const savedOrgId = localStorage.getItem('current-organization');
    const savedOrgs = localStorage.getItem('organizations');

    if (savedOrgs) {
      try {
        const parsed = JSON.parse(savedOrgs);
        setOrganizations(parsed);

        if (savedOrgId) {
          const org = parsed.find((o: Organization) => o.id === savedOrgId);
          setCurrentOrganization(org || parsed[0]);
        } else {
          setCurrentOrganization(parsed[0]);
        }
      } catch (error) {
        console.error('Failed to parse saved organizations:', error);
        setCurrentOrganization(defaultOrganizations[0]);
      }
    } else {
      setCurrentOrganization(defaultOrganizations[0]);
    }
  }, []);

  // Save to localStorage whenever organizations or current org changes
  useEffect(() => {
    localStorage.setItem('organizations', JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('current-organization', currentOrganization.id);
      if (currentOrganization.theme) {
        applyTheme(currentOrganization.theme);
      }
      if (currentOrganization.fonts) {
        applyFonts(currentOrganization.fonts);
      }
    }
  }, [currentOrganization]);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
    }
  };

  const updateOrganization = (
    orgId: string,
    updates: Partial<Organization>,
  ) => {
    setOrganizations((prev) =>
      prev.map((org) => (org.id === orgId ? { ...org, ...updates } : org)),
    );

    if (currentOrganization?.id === orgId) {
      setCurrentOrganization((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const applyTheme = (theme: ThemeColors) => {
    const root = document.documentElement;

    // Apply main theme CSS custom properties
    Object.entries(theme).forEach(([key, value]) => {
      // Convert camelCase to kebab-case for CSS variables
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });

    // Apply specific mappings for consistency
    root.style.setProperty('--ring', theme.inputRing);
    root.style.setProperty('--cursor-color', theme.cursorColor);
  };

  const applyFonts = (fonts: FontSettings) => {
    const root = document.documentElement;

    // Apply font CSS custom properties
    root.style.setProperty('--font-heading', fonts.headingFont);
    root.style.setProperty('--font-body', fonts.bodyFont);
    root.style.setProperty('--font-size', fonts.fontSize);
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        switchOrganization,
        updateOrganization,
        applyTheme,
        applyFonts,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider',
    );
  }
  return context;
}

export type { Organization, ThemeColors, FontSettings };

// Export the parsed defaults for use in the settings page
export { defaultThemeColors, defaultFontSettings };
