import type { Color } from '@/types';
import type { ShadingRole, ShadingStep } from './colorAnalysis';

/** Each painterly step as one flat zone, or the same zones blended where they meet. */
export type SpherePaint = 'steps' | 'blend';
export type SpherePalette = Record<ShadingRole, Color['rgb']>;
type Rgb = Color['rgb'];
type Vector = { x: number; y: number; z: number };

function unit(x: number, y: number, z: number): Vector {
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}

/** The key light, from the upper left and in front. The camera looks along -Z; screen Y points down. */
export const SPHERE_LIGHT = unit(-0.55, -0.72, 0.42);
/** A back light from the right, a little above and behind: it only grazes the right edge. */
const RIM_LIGHT = unit(0.75, -0.2, -0.63);
/** Halfway between the key light and the eye: the highlight mirrors the light here. */
const MIRROR = unit(SPHERE_LIGHT.x, SPHERE_LIGHT.y, SPHERE_LIGHT.z + 1);

// Where each zone begins, and how far a blended edge reaches either side of it. Light and shade
// follow the cosine between the surface and the key light (-1 to 1): the light plane faces it, the
// midtone runs down to the terminator and the core shadow is the band just past it. Beyond the core
// shadow, light bounced back from the ground lifts the far side to the shadow tone. The rim light
// catches the right edge on the shadow side, and the highlight is the small spot facing MIRROR.
// On the visible half the midtone, the picked color, takes the most room (about 41%), then the
// light plane (25%), the core shadow (14%), the shadow tone (11%), the rim (5%) and the highlight.
const LIGHT_FROM = 0.62;
const MID_FROM = 0.02;
const CORE_FROM = -0.3;
const RIM_FROM = 0.25;
const SPOT_FROM = 0.978;

function zone(value: number, from: number, reach: number, paint: SpherePaint): number {
  if (paint === 'steps') return value >= from ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - from + reach) / (2 * reach)));
  return t * t * (3 - 2 * t);
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  if (amount <= 0) return from;
  if (amount >= 1) return to;
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  };
}

/** The painterly steps by role, as RGB. */
export function spherePalette(steps: ShadingStep[]): SpherePalette {
  const palette = {} as SpherePalette;
  for (const step of steps) palette[step.role] = step.color.rgb;
  return palette;
}

/**
 * The color painted at one point of the sphere, given its unit normal (screen axes, Z toward the eye).
 * With 'steps' every point takes exactly one step's color; 'blend' mixes neighbouring steps at the edges.
 */
export function paintSpherePoint(palette: SpherePalette, nx: number, ny: number, nz: number, paint: SpherePaint): Rgb {
  const facing = nx * SPHERE_LIGHT.x + ny * SPHERE_LIGHT.y + nz * SPHERE_LIGHT.z;
  const rim = nx * RIM_LIGHT.x + ny * RIM_LIGHT.y + nz * RIM_LIGHT.z;
  const mirror = nx * MIRROR.x + ny * MIRROR.y + nz * MIRROR.z;
  let color = palette.shadowTone;
  color = mix(color, palette.shadow, zone(facing, CORE_FROM, 0.12, paint));
  color = mix(color, palette.midtone, zone(facing, MID_FROM, 0.1, paint));
  color = mix(color, palette.light, zone(facing, LIGHT_FROM, 0.14, paint));
  color = mix(color, palette.rim, zone(rim, RIM_FROM, 0.1, paint) * zone(-facing, 0, 0.12, paint));
  color = mix(color, palette.highlight, zone(mirror, SPOT_FROM, 0.012, paint));
  return color;
}
