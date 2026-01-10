import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

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
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// Color name approximation
const colorNames: Record<string, string> = {
  '#FF0000': 'Red',
  '#FF4500': 'Orange Red',
  '#FFA500': 'Orange',
  '#FFD700': 'Gold',
  '#FFFF00': 'Yellow',
  '#9ACD32': 'Yellow Green',
  '#00FF00': 'Lime',
  '#32CD32': 'Lime Green',
  '#008000': 'Green',
  '#006400': 'Dark Green',
  '#00FFFF': 'Cyan',
  '#008B8B': 'Dark Cyan',
  '#0000FF': 'Blue',
  '#00008B': 'Dark Blue',
  '#4169E1': 'Royal Blue',
  '#8A2BE2': 'Blue Violet',
  '#9400D3': 'Dark Violet',
  '#FF00FF': 'Magenta',
  '#FF1493': 'Deep Pink',
  '#FFC0CB': 'Pink',
  '#FFFFFF': 'White',
  '#C0C0C0': 'Silver',
  '#808080': 'Gray',
  '#000000': 'Black',
  '#A52A2A': 'Brown',
  '#DEB887': 'Burlywood',
  '#D2691E': 'Chocolate',
  '#8B4513': 'Saddle Brown',
  '#F5F5DC': 'Beige',
  '#FAF0E6': 'Linen',
};

export function getColorName(hex: string): string {
  const normalized = hex.toUpperCase();
  if (colorNames[normalized]) {
    return colorNames[normalized];
  }

  // Find closest color
  const rgb = hexToRgb(hex);
  let closestName = 'Custom';
  let minDistance = Infinity;

  for (const [colorHex, name] of Object.entries(colorNames)) {
    const colorRgb = hexToRgb(colorHex);
    const distance = Math.sqrt(
      Math.pow(rgb.r - colorRgb.r, 2) +
      Math.pow(rgb.g - colorRgb.g, 2) +
      Math.pow(rgb.b - colorRgb.b, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }

  return closestName;
}
