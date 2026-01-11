export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  name?: string;
}

export type StyleType = 'original' | 'hypercasual' | 'stylized' | 'realistic' | 'custom';

export interface Palette {
  id: string;
  name: string;
  colors: Color[];
  sourceImageUrl?: string;
  style: StyleType;
  tags: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface Folder {
  id: string;
  name: string;
  userId?: string;
  parentId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: 'free' | 'pro';
  stripeCustomerId?: string;
  createdAt: string;
}

export interface CustomStyleSettings {
  saturationMultiplier: number;
  lightnessMultiplier: number;
  hueShift: number;
}

export type ExportFormat = 'png' | 'json' | 'css' | 'scss' | 'unity' | 'unreal';

export interface ColorVariation {
  shadow2: Color;      // 가장 어두운 그림자
  shadow1: Color;      // 그림자
  midtone: Color;      // 중간톤 (원본)
  highlight1: Color;   // 하이라이트
  highlight2: Color;   // 가장 밝은 하이라이트
  hueShiftAmount: number;  // 적용된 Hue Shift 양 (도)
}

export type VariationStyle = 'stylized' | 'realistic';
