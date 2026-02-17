import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Palette, Color, StyleType, CustomStyleSettings, Folder } from '@/types';
import { generateId } from '@/lib/utils';
import { applyStyleFilter, toGrayscale, defaultCustomSettings } from '@/lib/styleFilters';
import { ExtractionMethod } from '@/lib/colorExtractor';
import { applyColorBlindnessToColors, ColorBlindnessType } from '@/lib/colorVision';

interface PaletteState {
  // Current editing state
  currentPalette: Palette | null;
  originalColors: Color[];
  currentStyle: StyleType;
  customSettings: CustomStyleSettings;
  valueCheckEnabled: boolean;
  colorBlindMode: ColorBlindnessType;
  colorCount: number;
  sourceImageUrl: string | null;
  extractionMethod: ExtractionMethod;

  // Library
  savedPalettes: Palette[];
  folders: Folder[];

  // Actions
  setCurrentPalette: (palette: Palette | null) => void;
  setOriginalColors: (colors: Color[]) => void;
  setCurrentStyle: (style: StyleType) => void;
  setCustomSettings: (settings: CustomStyleSettings) => void;
  toggleValueCheck: () => void;
  setColorBlindMode: (mode: ColorBlindnessType) => void;
  setColorCount: (count: number) => void;
  setSourceImageUrl: (url: string | null) => void;
  setExtractionMethod: (method: ExtractionMethod) => void;

  // Color manipulation
  updateColors: (colors: Color[]) => void;
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

type PersistedPaletteState = Pick<
  PaletteState,
  'savedPalettes' | 'folders' | 'colorCount' | 'extractionMethod' | 'colorBlindMode'
>;

const PALETTE_STORAGE_KEY = 'pixelpow-storage';
const LEGACY_PALETTE_STORAGE_KEY = 'gamepalette-storage';

const paletteStorage = createJSONStorage<PersistedPaletteState>(() => ({
  getItem: (name) => {
    const currentValue = window.localStorage.getItem(name);
    if (currentValue !== null) {
      return currentValue;
    }

    // Backward compatibility for users who already had data under the old key.
    return window.localStorage.getItem(LEGACY_PALETTE_STORAGE_KEY);
  },
  setItem: (name, value) => {
    window.localStorage.setItem(name, value);
    window.localStorage.removeItem(LEGACY_PALETTE_STORAGE_KEY);
  },
  removeItem: (name) => {
    window.localStorage.removeItem(name);
    window.localStorage.removeItem(LEGACY_PALETTE_STORAGE_KEY);
  },
}));

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPalette: null,
      originalColors: [],
      currentStyle: 'original',
      customSettings: defaultCustomSettings,
      valueCheckEnabled: false,
      colorBlindMode: 'none',
      colorCount: 5,
      sourceImageUrl: null,
      extractionMethod: 'histogram',
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

      setColorBlindMode: (mode) => set({ colorBlindMode: mode }),

      setColorCount: (count) => set({ colorCount: count }),

      setSourceImageUrl: (url) => set({ sourceImageUrl: url }),

      setExtractionMethod: (method) => set({ extractionMethod: method }),

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

      getDisplayColors: () => {
        const state = get();
        if (!state.currentPalette) return [];
        const cvdColors = applyColorBlindnessToColors(state.currentPalette.colors, state.colorBlindMode);
        return state.valueCheckEnabled ? toGrayscale(cvdColors) : cvdColors;
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
      name: PALETTE_STORAGE_KEY,
      storage: paletteStorage,
      partialize: (state) => ({
        savedPalettes: state.savedPalettes,
        folders: state.folders,
        colorCount: state.colorCount,
        extractionMethod: state.extractionMethod,
        colorBlindMode: state.colorBlindMode,
      }),
    }
  )
);
