'use client';

import type React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type {
  ThemeColors,
  FontSettings,
  ThemeMode,
} from '@/lib/theme/defaults';
import { getFontClassName } from '@/lib/theme/fonts';

import { useEffect } from 'react';

interface AgentThemePreviewProps {
  colors: ThemeColors;
  fonts?: FontSettings;
  mode?: ThemeMode;
}

export function AgentThemePreview({
  colors,
  fonts,
  mode = 'light',
}: AgentThemePreviewProps) {
  console.log(
    'Rendering AgentThemePreview with colors:',
    colors,
    'mode:',
    mode,
  );

  useEffect(() => {
    console.log('AgentThemePreview colors updated:', colors);
  }, [colors]);

  // Get the actual font classes for the fonts
  const headingFontClass = getFontClassName(
    colors.headingFont || fonts?.headingFont || 'Inter',
  );
  const bodyFontClass = getFontClassName(
    colors.bodyFont || fonts?.bodyFont || 'Inter',
  );

  const previewStyle = {
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--muted': colors.muted,
    '--accent': colors.accent,
    '--border': colors.border,
    '--destructive': colors.destructive,
    '--destructive-foreground': colors.destructiveForeground,
    '--card': colors.card,
    '--card-foreground': colors.cardForeground,
    '--input': colors.input,
    '--sidebar-background': colors.sidebarBackground,
    '--sidebar-foreground': colors.sidebarForeground,
    '--sidebar-primary': colors.sidebarPrimary,
    '--sidebar-primary-foreground': colors.sidebarPrimaryForeground,
    '--sidebar-accent': colors.sidebarAccent,
    '--sidebar-accent-foreground': colors.sidebarAccentForeground,
    '--sidebar-border': colors.sidebarBorder,
    '--sidebar-ring': colors.sidebarRing,
    '--input-ring': colors.inputRing,
    '--primary-font-color': colors.primaryFontColor,
    '--cursor-color': colors.cursorColor,
    '--ring': colors.inputRing,
    '--font-heading': colors.headingFont || fonts?.headingFont,
    '--font-body': colors.bodyFont || fonts?.bodyFont,
    '--font-size': colors.fontSize || fonts?.fontSize,
  } as React.CSSProperties;

  return (
    <Card style={previewStyle} className={bodyFontClass}>
      <CardContent>
        <div className="space-y-4 bg-background text-foreground p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3
              className={`text-lg font-semibold ${headingFontClass}`}
              style={{
                color: 'hsl(var(--primary-font-color))',
              }}
            >
              Theme Preview
            </h3>
            <Badge variant="secondary">Sample Badge</Badge>
          </div>

          {/* Sample Card */}
          <Card
            style={{
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <CardHeader>
              <CardTitle
                className={`${headingFontClass}`}
                style={{
                  color: 'hsl(var(--primary-font-color))',
                }}
              >
                Sample Card
              </CardTitle>
              <CardDescription className={bodyFontClass}>
                This is how your theme will look
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
                <label className={`text-sm font-medium ${bodyFontClass}`}>
                  Sample Input
                </label>
                <Input
                  placeholder="Enter some text..."
                  className={bodyFontClass}
                  style={{
                    backgroundColor: 'hsl(var(--input))',
                    caretColor: 'hsl(var(--cursor-color))',
                  }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className={bodyFontClass}
                  style={{
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }}
                >
                  Primary Button
                </Button>
                <Button
                  variant="secondary"
                  className={bodyFontClass}
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    color: 'hsl(var(--secondary-foreground))',
                  }}
                >
                  Secondary
                </Button>
                <Button
                  variant="outline"
                  className={bodyFontClass}
                  style={{
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  Outline
                </Button>
                <Button
                  variant="destructive"
                  className={bodyFontClass}
                  style={{
                    backgroundColor: 'hsl(var(--destructive))',
                    color: 'hsl(var(--destructive-foreground))',
                  }}
                >
                  Destructive
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Preview */}
          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'hsl(var(--sidebar-background))',
              color: 'hsl(var(--sidebar-foreground))',
              borderColor: 'hsl(var(--sidebar-border))',
            }}
          >
            <div className={`text-sm font-medium mb-2 ${bodyFontClass}`}>
              Sidebar Preview
            </div>
            <div className="space-y-1">
              <div className={`p-2 rounded text-xs ${bodyFontClass}`}>
                Navigation Item
              </div>
              <div
                className={`p-2 rounded text-xs ${bodyFontClass}`}
                style={{
                  backgroundColor: 'hsl(var(--sidebar-accent))',
                  color: 'hsl(var(--sidebar-accent-foreground))',
                }}
              >
                Active Item
              </div>
            </div>
          </div>

          {/* Color Swatches */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(colors)
              .filter(
                ([name]) => !name.includes('Font') && !name.includes('Size'),
              ) // Filter out font settings
              .slice(0, 12) // Show more colors including card and input
              .map(([name, value]) => (
                <div key={name} className="text-center">
                  <div
                    className="w-full h-8 rounded border mb-1"
                    style={{ backgroundColor: `hsl(${value})` }}
                  />
                  <p className={`text-xs font-mono ${bodyFontClass}`}>{name}</p>
                </div>
              ))}
          </div>
          {/* Add a section to show secondary foreground color */}
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'hsl(var(--secondary))',
              color: 'hsl(var(--secondary-foreground))',
            }}
          >
            <div className={`text-sm font-medium ${bodyFontClass}`}>
              Secondary Background with Secondary Foreground Text
            </div>
            <div className={`text-xs mt-1 ${bodyFontClass}`}>
              This shows how text appears on secondary backgrounds
            </div>
          </div>

          {/* Font Preview Section */}
          <div className="p-3 rounded-lg border bg-card text-card-foreground">
            <div className={`text-sm font-medium mb-2 ${bodyFontClass}`}>
              Font Preview
            </div>
            <div className="space-y-2">
              <div className={`text-lg font-semibold ${headingFontClass}`}>
                Heading Font: {colors.headingFont || 'Inter'}
              </div>
              <div className={`text-sm ${bodyFontClass}`}>
                Body Font: {colors.bodyFont || 'Inter'} - This is how regular
                text will appear throughout the interface.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
