"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      // Canonical single-value mode: pass the number directly. Wrapping in
      // `[value]` put base-ui into RANGE mode with a single thumb — a degenerate
      // config whose range-specific pointer machinery (closest-thumb detection +
      // collision handling) is the suspected cause of the thumb not dragging.
      // A plain number uses the simpler single-thumb path. The callback is
      // unwrapped defensively in case any base-ui path still hands back an array.
      value={value}
      onValueChange={(next: number | readonly number[]) =>
        onValueChange(Array.isArray(next) ? next[0] : (next as number))
      }
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn("w-full touch-none select-none", className)}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          <SliderPrimitive.Thumb
            className={cn(
              "block size-4 rounded-full border-2 border-primary bg-background shadow-sm",
              "transition-shadow hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "data-[dragging]:shadow-lg",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
