import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Palette, Color, StyleType, CustomStyleSettings, Folder } from '@/types';
import { generateId } from '@/lib/utils';
import { applyStyleFilter, toGrayscale, defaultCustomSettings } from '@/lib/styleFilters';

interface PaletteState {
  // Current editing state
  currentPalette: Palette | null;
  originalColors: Color[];
  currentStyle: StyleType;
  customSettings: CustomStyleSettings;
  valueCheckEnabled: boolean;
  colorCount: number;
  sourceImageUrl: string | null;

  // Library
  savedPalettes: Palette[];
  folders: Folder[];

  // Actions
  setCurrentPalette: (palette: Palette | null) => void;
  setOriginalColors: (colors: Color[]) => void;
  setCurrentStyle: (style: StyleType) => void;
  setCustomSettings: (settings: CustomStyleSettings) => void;
  toggleValueCheck: () => void;
  setColorCount: (count: number) => void;
  setSourceImageUrl: (url: string | null) => void;

  // Color manipulation
  updateColors: (colors: Color[]) => void;
  applyStyle: (style: StyleType) => void;
  getDisplayColors: () => Color[];

  // Library actions
  savePalette: (name: string) => string;
  updatePalette: (id: string, updates: Partial<Palette>) => void;
  deletePalette: (id: string) => void;
  getPaletteById: (id: string) => Palette | undefined;

  // Folder actions
  createFolder: (name: string, parentId?: string) => void;
  deleteFolder: (id: string) => void;
  movePaletteToFolder: (paletteId: string, folderId: string | undefined) => void;

  // Reset
  resetCurrentPalette: () => void;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPalette: null,
      originalColors: [],
      currentStyle: 'original',
      customSettings: defaultCustomSettings,
      valueCheckEnabled: false,
      colorCount: 5,
      sourceImageUrl: null,
      savedPalettes: [],
      folders: [],

      // Setters
      setCurrentPalette: (palette) => set({ currentPalette: palette }),

      setOriginalColors: (colors) => set({
        originalColors: colors,
        currentPalette: get().currentPalette
          ? { ...get().currentPalette!, colors: applyStyleFilter(colors, get().currentStyle, get().customSettings) }
          : null,
      }),

      setCurrentStyle: (style) => {
        const state = get();
        const newColors = applyStyleFilter(state.originalColors, style, state.customSettings);
        set({
          currentStyle: style,
          currentPalette: state.currentPalette
            ? { ...state.currentPalette, colors: newColors, style }
            : null,
        });
      },

      setCustomSettings: (settings) => {
        const state = get();
        set({ customSettings: settings });
        if (state.currentStyle === 'custom') {
          const newColors = applyStyleFilter(state.originalColors, 'custom', settings);
          set({
            currentPalette: state.currentPalette
              ? { ...state.currentPalette, colors: newColors }
              : null,
          });
        }
      },

      toggleValueCheck: () => set((state) => ({ valueCheckEnabled: !state.valueCheckEnabled })),

      setColorCount: (count) => set({ colorCount: count }),

      setSourceImageUrl: (url) => set({ sourceImageUrl: url }),

      // Color manipulation
      updateColors: (colors) => {
        const state = get();
        set({
          originalColors: colors,
          currentPalette: state.currentPalette
            ? { ...state.currentPalette, colors: applyStyleFilter(colors, state.currentStyle, state.customSettings) }
            : null,
        });
      },

      applyStyle: (style) => {
        const state = get();
        const newColors = applyStyleFilter(state.originalColors, style, state.customSettings);
        set({
          currentStyle: style,
          currentPalette: state.currentPalette
            ? { ...state.currentPalette, colors: newColors, style }
            : null,
        });
      },

      getDisplayColors: () => {
        const state = get();
        if (!state.currentPalette) return [];
        if (state.valueCheckEnabled) {
          return toGrayscale(state.currentPalette.colors);
        }
        return state.currentPalette.colors;
      },

      // Library actions
      savePalette: (name) => {
        const state = get();
        if (!state.currentPalette) return '';

        const id = generateId();
        const now = new Date().toISOString();

        const newPalette: Palette = {
          ...state.currentPalette,
          id,
          name,
          sourceImageUrl: state.sourceImageUrl || undefined,
          createdAt: now,
          updatedAt: now,
        };

        set({
          savedPalettes: [...state.savedPalettes, newPalette],
          currentPalette: newPalette,
        });

        return id;
      },

      updatePalette: (id, updates) => {
        set((state) => ({
          savedPalettes: state.savedPalettes.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deletePalette: (id) => {
        set((state) => ({
          savedPalettes: state.savedPalettes.filter((p) => p.id !== id),
        }));
      },

      getPaletteById: (id) => {
        return get().savedPalettes.find((p) => p.id === id);
      },

      // Folder actions
      createFolder: (name, parentId) => {
        const folder: Folder = {
          id: generateId(),
          name,
          parentId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          folders: [...state.folders, folder],
        }));
      },

      deleteFolder: (id) => {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          savedPalettes: state.savedPalettes.map((p) =>
            p.folderId === id ? { ...p, folderId: undefined } : p
          ),
        }));
      },

      movePaletteToFolder: (paletteId, folderId) => {
        set((state) => ({
          savedPalettes: state.savedPalettes.map((p) =>
            p.id === paletteId ? { ...p, folderId } : p
          ),
        }));
      },

      // Reset
      resetCurrentPalette: () => {
        set({
          currentPalette: null,
          originalColors: [],
          currentStyle: 'original',
          customSettings: defaultCustomSettings,
          valueCheckEnabled: false,
          sourceImageUrl: null,
        });
      },
    }),
    {
      name: 'gamepalette-storage',
      partialize: (state) => ({
        savedPalettes: state.savedPalettes,
        folders: state.folders,
        colorCount: state.colorCount,
      }),
    }
  )
);
