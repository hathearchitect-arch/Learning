'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import type {
  ThemeColors,
  ThemeMode,
  FontSettings,
} from '@/lib/theme/defaults';
import {
  defaultLightThemeColors,
  defaultDarkThemeColors,
} from '@/lib/theme/defaults';
import { getFontClassName } from '@/lib/theme/fonts';

interface ThemeCustomProps {
  theme?: ThemeMode;
  themeAttributes?: ThemeColors;
  fonts?: FontSettings;
  children: React.ReactNode;
}

export const ThemeCustom: React.FC<ThemeCustomProps> = ({
  theme = 'light',
  themeAttributes,
  fonts,
  children,
}) => {
  // Get the base theme colors based on the theme mode
  const defaultThemeColors =
    theme === 'dark' ? defaultDarkThemeColors : defaultLightThemeColors;

  const currentThemeColors = themeAttributes || defaultThemeColors;

  // Extract font settings from themeAttributes if they exist
  const headingFont =
    fonts?.headingFont || currentThemeColors.headingFont || 'Inter';
  const bodyFont = fonts?.bodyFont || currentThemeColors.bodyFont || 'Inter';
  const fontSize = fonts?.fontSize || currentThemeColors.fontSize || '16px';

  const themeStyle = {
    '--primary': currentThemeColors.primary,
    '--primary-foreground': currentThemeColors.primaryForeground,
    '--secondary': currentThemeColors.secondary,
    '--secondary-foreground': currentThemeColors.secondaryForeground,
    '--background': currentThemeColors.background,
    '--foreground': currentThemeColors.foreground,
    '--muted': currentThemeColors.muted,
    '--accent': currentThemeColors.accent,
    '--border': currentThemeColors.border,
    '--destructive': currentThemeColors.destructive,
    '--destructive-foreground': currentThemeColors.destructiveForeground,
    '--card': currentThemeColors.card,
    '--card-foreground': currentThemeColors.cardForeground,
    '--input': currentThemeColors.input,
    '--sidebar-background': currentThemeColors.sidebarBackground,
    '--sidebar-foreground': currentThemeColors.sidebarForeground,
    '--sidebar-primary': currentThemeColors.sidebarPrimary,
    '--sidebar-primary-foreground': currentThemeColors.sidebarPrimaryForeground,
    '--sidebar-accent': currentThemeColors.sidebarAccent,
    '--sidebar-accent-foreground': currentThemeColors.sidebarAccentForeground,
    '--sidebar-border': currentThemeColors.sidebarBorder,
    '--sidebar-ring': currentThemeColors.sidebarRing,
    '--input-ring': currentThemeColors.inputRing,
    '--ring': currentThemeColors.inputRing,
    '--primary-font-color': currentThemeColors.primaryFontColor,
    '--cursor-color': currentThemeColors.cursorColor,
    // Font settings - use CSS font families with fallbacks
    '--font-heading': `"${headingFont}", sans-serif`,
    '--font-body': `"${bodyFont}", sans-serif`,
    '--font-size': fontSize,
  } as React.CSSProperties;

  // Get the CSS class names for the fonts to apply to the root
  const headingFontClass = getFontClassName(headingFont);
  const bodyFontClass = getFontClassName(bodyFont);

  return (
    <ThemeProvider forcedTheme={theme} attribute="class" enableSystem={false}>
      <div style={themeStyle} className={`${bodyFontClass}`}>
        {children}
      </div>
    </ThemeProvider>
  );
};
