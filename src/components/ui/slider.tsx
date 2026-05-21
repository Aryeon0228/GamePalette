"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: number
  onValueChange?: (value: number) => void
  /** Fired when the user finishes interacting (pointer up / key up), useful for
   * deferring expensive work until the value settles. */
  onValueCommit?: (value: number) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, onValueCommit, ...props }, ref) => {
    const commit = (e: React.SyntheticEvent<HTMLInputElement>) => {
      onValueCommit?.(Number(e.currentTarget.value))
    }
    return (
      <input
        type="range"
        className={cn(
          "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
          className
        )}
        ref={ref}
        value={value}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onTouchEnd={commit}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
