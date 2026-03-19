'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function ColorPicker({
  label,
  value,
  onChange,
  description,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert HSL string to hex for color input
  const hslToHex = (hsl: string) => {
    try {
      const [h, s, l] = hsl
        .split(' ')
        .map((val) => Number.parseFloat(val.replace('%', '')));

      // Handle invalid values
      if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) {
        console.warn('Invalid HSL values:', hsl);
        return '#000000';
      }

      // Convert HSL to RGB
      const hue = h / 360;
      const saturation = s / 100;
      const lightness = l / 100;

      const hueToRgb = (p: number, q: number, t: number) => {
        let tempT = t;
        if (tempT < 0) tempT += 1;
        if (tempT > 1) tempT -= 1;
        if (tempT < 1 / 6) return p + (q - p) * 6 * tempT;
        if (tempT < 1 / 2) return q;
        if (tempT < 2 / 3) return p + (q - p) * (2 / 3 - tempT) * 6;
        return p;
      };

      let r: number;
      let g: number;
      let b: number;

      if (saturation === 0) {
        r = g = b = lightness; // achromatic
      } else {
        const q =
          lightness < 0.5
            ? lightness * (1 + saturation)
            : lightness + saturation - lightness * saturation;
        const p = 2 * lightness - q;
        r = hueToRgb(p, q, hue + 1 / 3);
        g = hueToRgb(p, q, hue);
        b = hueToRgb(p, q, hue - 1 / 3);
      }

      // Convert to hex
      const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      };

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch (error) {
      console.error('Error converting HSL to hex:', error, hsl);
      return '#000000';
    }
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string) => {
    try {
      const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
      const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
      const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch (error) {
      console.error('Error converting hex to HSL:', error, hex);
      return '0 0% 0%';
    }
  };

  const currentHex = hslToHex(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={label}>{label}</Label>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-12 h-10 p-0 border-2"
              style={{ backgroundColor: currentHex }}
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <div>
                <Label htmlFor={`${label}-picker`}>Choose Color</Label>
                <input
                  id={`${label}-picker`}
                  type="color"
                  value={currentHex}
                  onChange={(e) => {
                    const hsl = hexToHsl(e.target.value);
                    console.log(
                      'Color picker changed:',
                      e.target.value,
                      '->',
                      hsl,
                    );
                    onChange(hsl);
                  }}
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>
              <div>
                <Label htmlFor={`${label}-input`}>HSL Value</Label>
                <Input
                  id={`${label}-input`}
                  value={value}
                  onChange={(e) => {
                    console.log('HSL input changed:', e.target.value);
                    onChange(e.target.value);
                  }}
                  placeholder="0 0% 0%"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={value}
          onChange={(e) => {
            console.log('HSL input changed (main):', e.target.value);
            onChange(e.target.value);
          }}
          placeholder="0 0% 0%"
          className="flex-1"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
