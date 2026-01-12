import { Color, StyleType, CustomStyleSettings, ColorVariation, VariationStyle } from '@/types';
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

/**
 * Generate color variations with optional hue shifting
 *
 * Stylized: Uses hue shifting for more vibrant/artistic look
 *   - Shadows shift toward Blue (240°) via shortest path
 *   - Highlights shift toward Yellow (60°) via shortest path
 *
 * Realistic: No hue shifting, only lightness changes
 */
export function generateColorVariations(
  color: Color,
  style: VariationStyle = 'stylized'
): ColorVariation {
  const { h, s, l } = color.hsl;

  // Stylized uses hue shifting, realistic doesn't
  const useHueShift = style === 'stylized';

  // Calculate hue shift amount based on the color
  const baseHueShift = useHueShift ? calculateOptimalHueShift(h, s) : 0;

  // Calculate direction based on color position
  // Shadows → toward Blue (240°), Highlights → toward Yellow (60°)
  const shadowDirection = useHueShift ? getShortestHueDirection(h, 240) : 0; // toward Blue
  const highlightDirection = useHueShift ? getShortestHueDirection(h, 60) : 0; // toward Yellow

  // Generate each variation with color-dependent direction
  const shadow2 = createVariation(h, s, l, -30, useHueShift ? shadowDirection * baseHueShift * 1.5 : 0);
  const shadow1 = createVariation(h, s, l, -15, useHueShift ? shadowDirection * baseHueShift * 0.75 : 0);
  const highlight1 = createVariation(h, s, l, 15, useHueShift ? highlightDirection * baseHueShift * 0.75 : 0);
  const highlight2 = createVariation(h, s, l, 30, useHueShift ? highlightDirection * baseHueShift * 1.5 : 0);

  return {
    shadow2,
    shadow1,
    midtone: color,
    highlight1,
    highlight2,
    hueShiftAmount: baseHueShift,
  };
}

/**
 * Get the direction (+1 or -1) to reach target hue via shortest path
 */
function getShortestHueDirection(fromHue: number, toHue: number): number {
  let diff = toHue - fromHue;

  // Normalize to -180 to +180 range (shortest path)
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  // Return direction: +1 for clockwise, -1 for counter-clockwise
  return diff >= 0 ? 1 : -1;
}

/**
 * Calculate optimal hue shift based on the base color
 * Generally: 10-30 degrees depending on saturation and hue position
 */
function calculateOptimalHueShift(h: number, s: number): number {
  // Low saturation colors need less hue shift
  const saturationFactor = Math.min(s / 100, 1);

  // Base shift amount (15 degrees - visible but not extreme)
  const baseShift = 15;

  // Adjust based on hue position
  // Warm colors (0-60, 300-360) can handle more shift
  // Cool colors (180-240) need less shift to avoid looking unnatural
  let hueFactor = 1;
  if (h >= 180 && h <= 240) {
    hueFactor = 0.7; // Cool colors - less shift
  } else if ((h >= 0 && h <= 60) || h >= 300) {
    hueFactor = 1.2; // Warm colors - more shift
  }

  return Math.round(baseShift * saturationFactor * hueFactor);
}

/**
 * Create a single color variation
 */
function createVariation(
  h: number,
  s: number,
  l: number,
  lightnessOffset: number,
  hueOffset: number
): Color {
  const MIN_L = 5;
  const MAX_L = 95;
  const MAX_OFFSET = 30; // Maximum offset value used in generateColorVariations
  const SPACE_USAGE = 0.5; // Use only 50% of available space for usable game colors

  // Apply lightness change using proportional distribution
  // This prevents clipping and keeps colors in usable range for games
  let newL: number;

  if (lightnessOffset < 0) {
    // Shadow: distribute into available dark space
    const availableSpace = l - MIN_L;
    const ratio = Math.abs(lightnessOffset) / MAX_OFFSET;
    newL = l - (availableSpace * ratio * SPACE_USAGE);
  } else if (lightnessOffset > 0) {
    // Highlight: distribute into available light space
    const availableSpace = MAX_L - l;
    const ratio = lightnessOffset / MAX_OFFSET;
    newL = l + (availableSpace * ratio * SPACE_USAGE);
  } else {
    newL = l;
  }

  // Ensure bounds (should already be within bounds, but just in case)
  newL = Math.min(Math.max(newL, MIN_L), MAX_L);

  // Apply hue shift (shadows go toward purple/blue, highlights go toward yellow)
  let newH = (h + hueOffset + 360) % 360;

  // Adjust saturation slightly
  // Shadows often benefit from slightly higher saturation
  // Highlights often need slightly lower saturation
  let newS = s;
  if (lightnessOffset < 0) {
    // Shadows: boost saturation slightly
    newS = Math.min(s * 1.1, 100);
  } else if (lightnessOffset > 0) {
    // Highlights: reduce saturation slightly
    newS = s * 0.9;
  }

  const rgb = hslToRgb(newH, newS, newL);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    rgb,
    hsl: { h: Math.round(newH), s: Math.round(newS), l: Math.round(newL) },
    name: getColorName(hex),
  };
}

/**
 * Get variation info text for display
 */
export function getVariationInfo(variation: ColorVariation, style: VariationStyle): {
  title: string;
  description: string;
} {
  if (style === 'stylized') {
    return {
      title: 'Hue Shift ON',
      description: `Shadows → Blue, Highlights → Yellow (±${Math.round(variation.hueShiftAmount * 0.75)}°~${Math.round(variation.hueShiftAmount * 1.5)}°)`,
    };
  } else {
    return {
      title: 'Hue Shift OFF',
      description: 'Pure lightness changes only, no hue shifting applied',
    };
  }
}
