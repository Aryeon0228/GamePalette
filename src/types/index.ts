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
