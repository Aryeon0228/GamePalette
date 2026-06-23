import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface SavedColorsState {
  colors: string[] // hex, uppercase, most-recent last
  add: (hex: string) => void
  remove: (hex: string) => void
  toggle: (hex: string) => void
  has: (hex: string) => boolean
}

/** Persisted list of individually saved (favorited) colors. */
export const useSavedColors = create<SavedColorsState>()(
  persist(
    (set, get) => ({
      colors: [],
      add: (hex) => {
        const h = hex.toUpperCase()
        if (!get().colors.includes(h)) set({ colors: [...get().colors, h] })
      },
      remove: (hex) => set({ colors: get().colors.filter((c) => c !== hex.toUpperCase()) }),
      toggle: (hex) => (get().has(hex) ? get().remove(hex) : get().add(hex)),
      has: (hex) => get().colors.includes(hex.toUpperCase()),
    }),
    {
      name: "pixelpaw-saved-colors",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
