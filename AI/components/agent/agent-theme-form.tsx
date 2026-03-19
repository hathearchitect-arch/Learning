import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ColorPicker } from '../color-picker';
import { Palette, Save, RotateCcw, Sun, Moon } from 'lucide-react';
import type { ThemeColors, ThemeMode } from '@/lib/theme/defaults';
import {
  defaultLightThemeColors,
  defaultDarkThemeColors,
} from '@/lib/theme/defaults';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';

interface AgentThemeFormProps {
  agent: {
    id: string;
    name: string;
    organizationId: string;
  };
  themeMode: ThemeMode;
  setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  themeColors: ThemeColors;
  setThemeColors: React.Dispatch<React.SetStateAction<ThemeColors>>;
}

export function AgentThemeForm({
  agent,
  themeMode,
  setThemeMode,
  themeColors,
  setThemeColors,
}: AgentThemeFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  function handleThemeReset() {
    const defaultColors =
      themeMode === 'dark' ? defaultDarkThemeColors : defaultLightThemeColors;
    setThemeColors(defaultColors);
  }

  function handleModeChange(newMode: ThemeMode) {
    setThemeMode(newMode);
    // Automatically update colors when mode changes
    const defaultColors =
      newMode === 'dark' ? defaultDarkThemeColors : defaultLightThemeColors;
    setThemeColors(defaultColors);
  }

  function updateColor(key: keyof ThemeColors, value: string) {
    console.log(`Updating color ${key} from ${themeColors[key]} to ${value}`);
    setThemeColors((prev: ThemeColors) => {
      const newColors = { ...prev, [key]: value };
      console.log('New theme colors:', newColors);
      return newColors;
    });
  }

  async function onThemeSubmit() {
    if (!agent.id) {
      toast.error('Agent ID is required');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        theme: themeMode,
        themeAttributes: themeColors,
      };

      console.log('Submitting theme update:', payload);

      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update theme: ${errorData}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Theme updated successfully!');
        console.log('Theme updated successfully:', result.data);
      } else {
        throw new Error(result.error || 'Failed to update theme');
      }
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update theme',
      );
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Main Theme Colors
          <div className="flex gap-3 justify-end ml-auto">
            <Button
              variant="outline"
              onClick={handleThemeReset}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={onThemeSubmit} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Theme'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Customize the primary colors for your application
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          <Separator />
          {/* Theme Mode Selector */}
          <div className="space-y-2">
            <Label htmlFor="theme-mode">Agent Theme</Label>
            <Select value={themeMode} onValueChange={handleModeChange}>
              <SelectTrigger id="theme-mode">
                <SelectValue placeholder="Select theme mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <Accordion type="multiple" className="w-full">
            {/* Brand Colors */}
            <AccordionItem value="brand-colors">
              <AccordionTrigger>Brand Colors</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  <ColorPicker
                    label="Primary"
                    value={themeColors.primary}
                    onChange={(value) => updateColor('primary', value)}
                    description="Main brand color for buttons and links"
                  />
                  <ColorPicker
                    label="Primary Foreground"
                    value={themeColors.primaryForeground}
                    onChange={(value) =>
                      updateColor('primaryForeground', value)
                    }
                    description="Text color on primary elements"
                  />
                  <ColorPicker
                    label="Secondary"
                    value={themeColors.secondary}
                    onChange={(value) => updateColor('secondary', value)}
                    description="Secondary elements and subtle backgrounds"
                  />
                  <ColorPicker
                    label="Secondary Foreground"
                    value={themeColors.secondaryForeground}
                    onChange={(value) =>
                      updateColor('secondaryForeground', value)
                    }
                    description="Text color on secondary elements"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Background & Layout */}
            <AccordionItem value="background-layout">
              <AccordionTrigger>Background & Layout</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  <ColorPicker
                    label="Background"
                    value={themeColors.background}
                    onChange={(value) => updateColor('background', value)}
                    description="Main background color"
                  />
                  <ColorPicker
                    label="Foreground"
                    value={themeColors.foreground}
                    onChange={(value) => updateColor('foreground', value)}
                    description="Primary text color"
                  />
                  <ColorPicker
                    label="Card Background"
                    value={themeColors.card}
                    onChange={(value) => updateColor('card', value)}
                    description="Background color for cards and panels"
                  />
                  <ColorPicker
                    label="Card Foreground"
                    value={themeColors.cardForeground}
                    onChange={(value) => updateColor('cardForeground', value)}
                    description="Text color on cards and panels"
                  />
                  <ColorPicker
                    label="Input Background"
                    value={themeColors.input}
                    onChange={(value) => updateColor('input', value)}
                    description="Background color for input fields"
                  />
                  <ColorPicker
                    label="Muted"
                    value={themeColors.muted}
                    onChange={(value) => updateColor('muted', value)}
                    description="Muted backgrounds and secondary text"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Interactive Elements */}
            <AccordionItem value="interactive-elements">
              <AccordionTrigger>Interactive Elements</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  <ColorPicker
                    label="Accent"
                    value={themeColors.accent}
                    onChange={(value) => updateColor('accent', value)}
                    description="Accent color for highlights"
                  />
                  <ColorPicker
                    label="Border"
                    value={themeColors.border}
                    onChange={(value) => updateColor('border', value)}
                    description="Border color for components"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sidebar Theme */}
            <AccordionItem value="sidebar-theme">
              <AccordionTrigger>Sidebar Theme</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  <ColorPicker
                    label="Sidebar Background"
                    value={themeColors.sidebarBackground}
                    onChange={(value) =>
                      updateColor('sidebarBackground', value)
                    }
                    description="Background color for the sidebar"
                  />
                  <ColorPicker
                    label="Sidebar Foreground"
                    value={themeColors.sidebarForeground}
                    onChange={(value) =>
                      updateColor('sidebarForeground', value)
                    }
                    description="Text color in the sidebar"
                  />
                  <ColorPicker
                    label="Sidebar Primary"
                    value={themeColors.sidebarPrimary}
                    onChange={(value) => updateColor('sidebarPrimary', value)}
                    description="Primary color for sidebar elements"
                  />
                  <ColorPicker
                    label="Sidebar Primary Foreground"
                    value={themeColors.sidebarPrimaryForeground}
                    onChange={(value) =>
                      updateColor('sidebarPrimaryForeground', value)
                    }
                    description="Text color on sidebar primary elements"
                  />
                  <ColorPicker
                    label="Sidebar Accent"
                    value={themeColors.sidebarAccent}
                    onChange={(value) => updateColor('sidebarAccent', value)}
                    description="Accent color for sidebar highlights"
                  />
                  <ColorPicker
                    label="Sidebar Accent Foreground"
                    value={themeColors.sidebarAccentForeground}
                    onChange={(value) =>
                      updateColor('sidebarAccentForeground', value)
                    }
                    description="Text color on sidebar accent elements"
                  />
                  <ColorPicker
                    label="Sidebar Border"
                    value={themeColors.sidebarBorder}
                    onChange={(value) => updateColor('sidebarBorder', value)}
                    description="Border color for sidebar elements"
                  />
                  <ColorPicker
                    label="Sidebar Ring"
                    value={themeColors.sidebarRing}
                    onChange={(value) => updateColor('sidebarRing', value)}
                    description="Focus ring color for sidebar elements"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Status & Feedback */}
            <AccordionItem value="status-feedback">
              <AccordionTrigger>Status & Feedback</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  <ColorPicker
                    label="Destructive"
                    value={themeColors.destructive}
                    onChange={(value) => updateColor('destructive', value)}
                    description="Error and destructive action color"
                  />
                  <ColorPicker
                    label="Destructive Foreground"
                    value={themeColors.destructiveForeground}
                    onChange={(value) =>
                      updateColor('destructiveForeground', value)
                    }
                    description="Text color on destructive elements"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
