import { useCallback, type Dispatch, type SetStateAction } from "react"
import { createStore, useStore } from "zustand"

export type Lesson = "scale" | "space" | "direction"
export type ObjectId = "box" | "cup" | "pencil" | "disc"
export type ArrangementObject = { id: ObjectId; x: number; y: number; scale: number; angle: number }
export type Study = { objects: ArrangementObject[]; preset: 0 | 1 | null; savedObjects?: ArrangementObject[] }
export type Guide = "thirds" | "golden" | "diagonals" | "spiral"

export function initialStudy(lesson: Lesson, preset: 0 | 1 = 1): Study {
  const object = (id: ObjectId, x: number, y: number, scale = 1, angle = 0): ArrangementObject => ({ id, x, y, scale, angle })
  if (lesson === "scale") return { preset, objects: [
    object("box", 175, 210, preset ? 1.7 : 1),
    object("cup", 375, 185, 1.1),
    object("pencil", 375, 327, preset ? 0.9 : 1.8, -8),
    object("disc", 550, 235, preset ? 0.6 : 1.18),
  ] }
  if (lesson === "space") return { preset, objects: preset ? [
    object("box", 205, 215), object("cup", 326, 205, 0.9),
    object("pencil", 270, 304, 0.88, -80), object("disc", 550, 213, 0.9),
  ] : [
    object("box", 120, 218), object("cup", 280, 218, 0.9),
    object("pencil", 435, 218, 0.88, -80), object("disc", 575, 218, 0.9),
  ] }
  return { preset, objects: preset ? [
    object("box", 288, 225, 1.2), object("disc", 432, 288, 0.9),
    object("pencil", 342, 285, 1.1, -28), object("cup", 387, 192, 1.1, 12),
  ] : [
    object("box", 130, 220, 1.2), object("disc", 580, 220, 0.9),
    object("pencil", 450, 220, 1.1, -90), object("cup", 300, 220, 1.1),
  ] }
}


type CompositionSession = {
  lesson: Lesson
  studies: Record<Lesson, Study>
  selectedId: ObjectId
  silhouette: boolean
  imageUrl: string | null
  sampleFor: string | null
  ratio: string
  panX: number
  panY: number
  threshold: number
  inverted: boolean
  original: boolean
  guides: Guide[]
  opacity: number
  rotation: number
  flipped: boolean
  scale: number
  offsetX: number
  offsetY: number
}

// A module-scoped store survives client-side lab navigation in this tab.
// No persistence middleware: uploaded image bytes never enter browser storage.
// Zustand uses the initial snapshot for SSR and hydration, then the current
// client snapshot; a returning page cannot overwrite the session with defaults.
export const compositionSession = createStore<CompositionSession>(() => ({
  lesson: "scale",
  studies: { scale: initialStudy("scale"), space: initialStudy("space"), direction: initialStudy("direction") },
  selectedId: "box",
  silhouette: false,
  imageUrl: null,
  sampleFor: null,
  ratio: "original",
  panX: 0,
  panY: 0,
  threshold: 128,
  inverted: false,
  original: false,
  guides: ["thirds"],
  opacity: 85,
  rotation: 0,
  flipped: false,
  scale: 100,
  offsetX: 0,
  offsetY: 0,
}))

export function useCompositionState<K extends keyof CompositionSession>(key: K): [CompositionSession[K], Dispatch<SetStateAction<CompositionSession[K]>>] {
  const value = useStore(compositionSession, state => state[key])
  const setValue = useCallback((next: SetStateAction<CompositionSession[K]>) => {
    compositionSession.setState(state => ({
      ...state,
      [key]: typeof next === "function" ? (next as (previous: CompositionSession[K]) => CompositionSession[K])(state[key]) : next,
    }))
  }, [key])
  return [value, setValue]
}
