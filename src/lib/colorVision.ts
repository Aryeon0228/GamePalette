import { Color } from "@/types";
import { getColorName, hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "@/lib/utils";

export type ColorBlindnessType = "none" | "protanopia" | "deuteranopia" | "tritanopia";
export type HarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic";

export interface ColorBlindnessOption {
  type: ColorBlindnessType;
  label: string;
  description: string;
}

export interface HarmonyColor {
  hex: string;
  name: string;
  angle: number;
}

export interface ColorHarmony {
  type: HarmonyType;
  name: string;
  description: string;
  colors: HarmonyColor[];
}

export const COLOR_BLINDNESS_OPTIONS: ColorBlindnessOption[] = [
  { type: "none", label: "Normal", description: "No simulation" },
  { type: "protanopia", label: "Protanopia", description: "Red-weak simulation" },
  { type: "deuteranopia", label: "Deuteranopia", description: "Green-weak simulation" },
  { type: "tritanopia", label: "Tritanopia", description: "Blue-weak simulation" },
];

const CVD_MATRICES: Record<Exclude<ColorBlindnessType, "none">, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = Math.max(0, Math.min(1, c));
  const out = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(out * 255);
}

function rotateHue(hex: string, degree: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const nextHue = (hsl.h + degree + 360) % 360;
  const shifted = hslToRgb(nextHue, hsl.s, hsl.l);
  return rgbToHex(shifted.r, shifted.g, shifted.b);
}

export function simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
  if (type === "none") return hex;

  const rgb = hexToRgb(hex);
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  const matrix = CVD_MATRICES[type];
  const sr = matrix[0][0] * lr + matrix[0][1] * lg + matrix[0][2] * lb;
  const sg = matrix[1][0] * lr + matrix[1][1] * lg + matrix[1][2] * lb;
  const sb = matrix[2][0] * lr + matrix[2][1] * lg + matrix[2][2] * lb;

  return rgbToHex(linearToSrgb(sr), linearToSrgb(sg), linearToSrgb(sb));
}

export function applyColorBlindnessToColors(
  colors: Color[],
  type: ColorBlindnessType
): Color[] {
  if (type === "none") return colors;

  return colors.map((color) => {
    const simulatedHex = simulateColorBlindness(color.hex, type);
    const rgb = hexToRgb(simulatedHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    return {
      ...color,
      hex: simulatedHex,
      rgb,
      hsl,
      name: getColorName(simulatedHex),
    };
  });
}

export function generateColorHarmonies(hex: string): ColorHarmony[] {
  return [
    {
      type: "complementary",
      name: "Complementary",
      description: "Opposite colors on wheel",
      colors: [
        { hex, name: "Base", angle: 0 },
        { hex: rotateHue(hex, 180), name: "Complement", angle: 180 },
      ],
    },
    {
      type: "analogous",
      name: "Analogous",
      description: "Adjacent colors",
      colors: [
        { hex: rotateHue(hex, -30), name: "Left", angle: -30 },
        { hex, name: "Base", angle: 0 },
        { hex: rotateHue(hex, 30), name: "Right", angle: 30 },
      ],
    },
    {
      type: "triadic",
      name: "Triadic",
      description: "Three evenly spaced colors",
      colors: [
        { hex, name: "Base", angle: 0 },
        { hex: rotateHue(hex, 120), name: "Second", angle: 120 },
        { hex: rotateHue(hex, 240), name: "Third", angle: 240 },
      ],
    },
    {
      type: "split-complementary",
      name: "Split Comp.",
      description: "Near-opposites for softer contrast",
      colors: [
        { hex, name: "Base", angle: 0 },
        { hex: rotateHue(hex, 150), name: "Split 1", angle: 150 },
        { hex: rotateHue(hex, 210), name: "Split 2", angle: 210 },
      ],
    },
    {
      type: "tetradic",
      name: "Tetradic",
      description: "Four colors at 90 degree intervals",
      colors: [
        { hex, name: "Base", angle: 0 },
        { hex: rotateHue(hex, 90), name: "Second", angle: 90 },
        { hex: rotateHue(hex, 180), name: "Third", angle: 180 },
        { hex: rotateHue(hex, 270), name: "Fourth", angle: 270 },
      ],
    },
  ];
}
