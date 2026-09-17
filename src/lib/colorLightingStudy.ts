import { normalizeHex } from './colorAnalysis';

export type LightingTemperature = 'neutral' | 'warm' | 'cool';
export type LightingView = 'render' | 'mask';
export type LightingRgb = [number, number, number];
export type LightingVector = [number, number, number];

export interface ColorLightingSettings {
  azimuth: number;
  elevation: number;
  temperature: LightingTemperature;
  keyEnabled: boolean;
  ambientEnabled: boolean;
  specularEnabled: boolean;
  groundHex: string;
}

export const DEFAULT_COLOR_LIGHTING: Readonly<ColorLightingSettings> = {
  azimuth: -42,
  elevation: 42,
  temperature: 'neutral',
  keyEnabled: true,
  ambientEnabled: true,
  specularEnabled: true,
  groundHex: '#787878',
};

// World Y points upward. The orthographic camera looks slightly down at the ground.
export const LIGHTING_CAMERA: LightingVector = [0, 0.36, Math.sqrt(1 - 0.36 ** 2)];
const TEMPERATURE_RGB: Record<LightingTemperature, LightingRgb> = {
  neutral: [1, 1, 1],
  warm: [1, 0.86, 0.7],
  cool: [0.76, 0.87, 1],
};

export const clampLighting = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const dotLighting = (a: LightingVector, b: LightingVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function normalizeLighting(vector: LightingVector): LightingVector {
  const length = Math.hypot(...vector);
  return length > 0 && Number.isFinite(length) ? vector.map(value => value / length) as LightingVector : [0, 0, 1];
}

export function srgbToLightingLinear(value: number): number {
  const channel = clampLighting(value);
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function lightingLinearToSrgb(value: number): number {
  const channel = clampLighting(value);
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function hexToLinear(hex: string): LightingRgb {
  return [1, 3, 5].map(offset => srgbToLightingLinear(parseInt(hex.slice(offset, offset + 2), 16) / 255)) as LightingRgb;
}

export function lightingRgbToHex(linear: LightingRgb): string {
  return '#' + linear.map(channel => Math.round(lightingLinearToSrgb(channel) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export interface ColorLightingStudy {
  baseHex: string;
  material: LightingRgb;
  ground: LightingRgb;
  light: LightingRgb;
  direction: LightingVector;
  halfDirection: LightingVector;
  settings: ColorLightingSettings;
}

/** Selected material and illumination are separate inputs; there is no palette state. */
export function buildColorLightingStudy(hex: string, options: Partial<ColorLightingSettings> = {}): ColorLightingStudy {
  const settings = { ...DEFAULT_COLOR_LIGHTING, ...options };
  settings.azimuth = Number.isFinite(settings.azimuth) ? clampLighting(settings.azimuth, -80, 80) : DEFAULT_COLOR_LIGHTING.azimuth;
  settings.elevation = Number.isFinite(settings.elevation) ? clampLighting(settings.elevation, 10, 80) : DEFAULT_COLOR_LIGHTING.elevation;
  settings.groundHex = normalizeHex(settings.groundHex) ?? DEFAULT_COLOR_LIGHTING.groundHex;
  const azimuth = settings.azimuth * Math.PI / 180;
  const elevation = settings.elevation * Math.PI / 180;
  const direction: LightingVector = [Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)];
  const baseHex = normalizeHex(hex) ?? '#000000';
  return {
    baseHex,
    material: hexToLinear(baseHex),
    ground: hexToLinear(settings.groundHex),
    light: TEMPERATURE_RGB[settings.temperature].map(srgbToLightingLinear) as LightingRgb,
    direction,
    halfDirection: normalizeLighting(direction.map((value, index) => value + LIGHTING_CAMERA[index]) as LightingVector),
    settings,
  };
}

export interface ColorLightingSample {
  linear: LightingRgb;
  diffuse: LightingRgb;
  environment: LightingRgb;
  specular: LightingRgb;
  directAmount: number;
}

/** Lambert diffuse + restrained Blinn–Phong dielectric highlight, evaluated in linear sRGB.
 * Ground bounce is an intentionally simple, one-bounce approximation, not path tracing.
 */
export function sampleColorLighting(study: ColorLightingStudy, normal: LightingVector): ColorLightingSample {
  const { settings, direction, material, light, ground, halfDirection } = study;
  const directAmount = settings.keyEnabled ? Math.max(0, dotLighting(normal, direction)) : 0;
  const ambient = settings.ambientEnabled ? 0.11 * (0.72 + normal[1] * 0.28) : 0;
  const groundFacing = Math.max(0, -normal[1]);
  const groundAmbient = settings.ambientEnabled ? 0.09 : 0;
  const groundKey = settings.keyEnabled ? 0.8 * direction[1] : 0;
  const bounce = settings.ambientEnabled ? groundFacing ** 2 * 0.2 : 0;
  const halfDot = Math.max(0, dotLighting(normal, halfDirection));
  // A neutral dielectric reflects the light color independently of its diffuse material.
  const reflection = settings.specularEnabled && directAmount > 0
    ? 0.19 * directAmount * (halfDot ** 88 + 0.08 * halfDot ** 24)
    : 0;
  const diffuse: LightingRgb = [0, 0, 0];
  const environment: LightingRgb = [0, 0, 0];
  const specular: LightingRgb = [0, 0, 0];
  const linear: LightingRgb = [0, 0, 0];
  for (let channel = 0; channel < 3; channel++) {
    diffuse[channel] = material[channel] * light[channel] * 0.86 * directAmount;
    environment[channel] = material[channel] * (ambient + ground[channel] * bounce * (groundAmbient + light[channel] * groundKey));
    specular[channel] = light[channel] * reflection;
    linear[channel] = diffuse[channel] + environment[channel] + specular[channel];
  }
  return { linear, diffuse, environment, specular, directAmount };
}

/** Transform a visible sphere point from image coordinates (Y up) to a world normal. */
export function visibleLightingNormal(x: number, y: number): LightingVector {
  const depth = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return [x, y * LIGHTING_CAMERA[2] + depth * LIGHTING_CAMERA[1], -y * LIGHTING_CAMERA[1] + depth * LIGHTING_CAMERA[2]];
}

/** Directional-light ray/sphere occlusion on Y=-1, with a small approximate penumbra. */
export function sampleLightingGround(study: ColorLightingStudy, x: number, z: number): LightingRgb {
  const { settings, direction, ground, light } = study;
  const projection = x * direction[0] - direction[1] + z * direction[2];
  const rayDistance = Math.sqrt(Math.max(0, x * x + 1 + z * z - projection * projection));
  const edge = clampLighting((rayDistance - 0.92) / 0.22);
  const visibility = projection < 0 ? edge * edge * (3 - 2 * edge) : 1;
  const direct = settings.keyEnabled ? 0.8 * direction[1] * visibility : 0;
  // Contact darkening stands in for ambient occlusion near the point of contact.
  const contact = 1 - 0.72 * Math.exp(-(x * x + z * z) / 0.1);
  const ambient = settings.ambientEnabled ? 0.09 * contact : 0;
  return ground.map((channel, index) => channel * (ambient + light[index] * direct)) as LightingRgb;
}

/** Both swatches are actual visible surface samples, away from the silhouette. */
export function getColorLightingSamples(study: ColorLightingStudy): { lit: string; dark: string } {
  let lightNormal = visibleLightingNormal(0, 0);
  let darkNormal = lightNormal;
  let greatest = -Infinity;
  let least = Infinity;
  for (let y = -0.9; y <= 0.9; y += 0.1) {
    for (let x = -0.9; x <= 0.9; x += 0.1) {
      if (x * x + y * y > 0.9 ** 2) continue;
      const normal = visibleLightingNormal(x, y);
      const amount = dotLighting(normal, study.direction);
      if (amount > greatest) { greatest = amount; lightNormal = normal; }
      if (amount < least) { least = amount; darkNormal = normal; }
    }
  }
  return { lit: lightingRgbToHex(sampleColorLighting(study, lightNormal).linear), dark: lightingRgbToHex(sampleColorLighting(study, darkNormal).linear) };
}
