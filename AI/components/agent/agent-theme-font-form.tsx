'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';
import { fontSelector, getFontClassName } from '@/lib/theme/fonts';
import type { ThemeColors } from '@/lib/theme/defaults';
import { Type } from 'lucide-react';

const formSchema = z.object({
  font: z.string().min(1, 'Font is required'),
});

interface AgentThemeFontFormProps {
  agent: {
    id: string;
    name: string;
    font?: string;
  };
  themeColors: ThemeColors;
  setThemeColors: React.Dispatch<React.SetStateAction<ThemeColors>>;
}

export function AgentThemeFontForm({
  agent,
  themeColors,
  setThemeColors,
}: AgentThemeFontFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fontOptions: string[] = Object.keys(fontSelector);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      font: agent.font || 'Inter',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    // Update local theme colors state - use the same font for both heading and body
    const updatedThemeColors = {
      ...themeColors,
      headingFont: values.font,
      bodyFont: values.font,
    };

    setThemeColors(updatedThemeColors);

    // Save to API
    saveToAPI(updatedThemeColors);
  }

  async function saveToAPI(updatedThemeColors: ThemeColors) {
    try {
      const payload = {
        font: updatedThemeColors.bodyFont || updatedThemeColors.headingFont,
        themeAttributes: updatedThemeColors,
      };

      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update font settings: ${errorData}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Font settings saved successfully!');
      } else {
        throw new Error(result.error || 'Failed to update font settings');
      }
    } catch (error) {
      console.error('Error updating font settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save font settings',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          Font Configuration
        </CardTitle>
        <CardDescription>
          Customize the font used throughout your agent interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="font"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Family</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Update preview immediately - use same font for both heading and body
                      setThemeColors((prev) => ({
                        ...prev,
                        headingFont: value,
                        bodyFont: value,
                      }));
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem
                          key={font}
                          value={font}
                          className={getFontClassName(font)}
                        >
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Font used for all text throughout the interface
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Font Settings'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
