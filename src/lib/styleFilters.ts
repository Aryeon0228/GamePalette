import { Color, StyleType, CustomStyleSettings } from '@/types';
import { hslToRgb, rgbToHex, getColorName } from './utils';

export function applyStyleFilter(
  colors: Color[],
  style: StyleType,
  customSettings?: CustomStyleSettings
): Color[] {
  switch (style) {
    case 'hypercasual':
      return colors.map(color => applyHypercasual(color));
    case 'stylized':
      return colors.map(color => applyStylized(color));
    case 'realistic':
      return colors.map(color => applyRealistic(color));
    case 'custom':
      if (customSettings) {
        return colors.map(color => applyCustom(color, customSettings));
      }
      return colors;
    case 'original':
    default:
      return colors;
  }
}

function applyHypercasual(color: Color): Color {
  // High saturation, bright tones, simple colors
  const { h, s, l } = color.hsl;

  const newS = Math.min(s * 1.3, 100);
  const newL = Math.max(l, 50) * 1.1;
  const clampedL = Math.min(newL, 90);

  const rgb = hslToRgb(h, newS, clampedL);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    rgb,
    hsl: { h, s: Math.round(newS), l: Math.round(clampedL) },
    name: getColorName(hex),
  };
}

function applyStylized(color: Color): Color {
  // Warm tone shift, medium saturation, harmonious colors
  const { h, s, l } = color.hsl;

  // Shift hue towards warm colors (reds/oranges)
  const warmShift = h < 180 ? 10 : -10;
  const newH = (h + warmShift + 360) % 360;
  const newS = s * 0.9;
  const newL = l * 0.95 + 10;
  const clampedL = Math.min(Math.max(newL, 20), 85);

  const rgb = hslToRgb(newH, newS, clampedL);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    rgb,
    hsl: { h: Math.round(newH), s: Math.round(newS), l: Math.round(clampedL) },
    name: getColorName(hex),
  };
}

function applyRealistic(color: Color): Color {
  // Low saturation, natural tones, subtle variations
  const { h, s, l } = color.hsl;

  const newS = s * 0.6;
  const newL = l * 0.9;
  const clampedL = Math.min(Math.max(newL, 10), 85);

  const rgb = hslToRgb(h, newS, clampedL);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    rgb,
    hsl: { h, s: Math.round(newS), l: Math.round(clampedL) },
    name: getColorName(hex),
  };
}

function applyCustom(color: Color, settings: CustomStyleSettings): Color {
  const { h, s, l } = color.hsl;

  const newH = (h + settings.hueShift + 360) % 360;
  const newS = Math.min(Math.max(s * settings.saturationMultiplier, 0), 100);
  const newL = Math.min(Math.max(l * settings.lightnessMultiplier, 0), 100);

  const rgb = hslToRgb(newH, newS, newL);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    rgb,
    hsl: { h: Math.round(newH), s: Math.round(newS), l: Math.round(newL) },
    name: getColorName(hex),
  };
}

// Convert palette to grayscale for value check
export function toGrayscale(colors: Color[]): Color[] {
  return colors.map(color => {
    const { r, g, b } = color.rgb;
    // Use luminance formula
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    const hex = rgbToHex(gray, gray, gray);

    return {
      hex,
      rgb: { r: gray, g: gray, b: gray },
      hsl: { h: 0, s: 0, l: Math.round((gray / 255) * 100) },
      name: `Gray ${Math.round((gray / 255) * 100)}%`,
    };
  });
}

export const defaultCustomSettings: CustomStyleSettings = {
  saturationMultiplier: 1.0,
  lightnessMultiplier: 1.0,
  hueShift: 0,
};
