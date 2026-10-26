"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

const LIGHT_SECTIONS = {
  cScale0: "#a3e635",
  cScaleLabel0: "#14532d",
  git0: "#a3e635",
  gitBranchLabel0: "#14532d",
  cScale1: "#dbeafe",
  cScaleLabel1: "#1e3a8a",
  cScale2: "#dcfce7",
  cScaleLabel2: "#14532d",
  cScale3: "#fef3c7",
  cScaleLabel3: "#78350f",
  cScale4: "#ede9fe",
  cScaleLabel4: "#4c1d95",
  cScale5: "#ffe4e6",
  cScaleLabel5: "#881337",
  cScale6: "#cffafe",
  cScaleLabel6: "#164e63",
  cScale7: "#f3e8ff",
  cScaleLabel7: "#6b21a8",
  cScale8: "#e2e8f0",
  cScaleLabel8: "#0f172a",
  cScale9: "#ffedd5",
  cScaleLabel9: "#7c2d12",
} as const

const DARK_SECTIONS = {
  cScale0: "#4d7c0f",
  cScaleLabel0: "#ecfccb",
  git0: "#4d7c0f",
  gitBranchLabel0: "#ecfccb",
  cScale1: "#1e3a8a",
  cScaleLabel1: "#dbeafe",
  cScale2: "#14532d",
  cScaleLabel2: "#dcfce7",
  cScale3: "#78350f",
  cScaleLabel3: "#fef3c7",
  cScale4: "#4c1d95",
  cScaleLabel4: "#ede9fe",
  cScale5: "#881337",
  cScaleLabel5: "#ffe4e6",
  cScale6: "#164e63",
  cScaleLabel6: "#cffafe",
  cScale7: "#581c87",
  cScaleLabel7: "#f3e8ff",
  cScale8: "#334155",
  cScaleLabel8: "#f1f5f9",
  cScale9: "#7c2d12",
  cScaleLabel9: "#ffedd5",
} as const

export function Mermaid({
  chart,
  className,
}: {
  chart: string
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const [svg, setSvg] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    const renderId = `mmd-${Math.random().toString(36).slice(2, 9)}`
    const dark = resolvedTheme === "dark"

    ;(async () => {
      try {
        const mermaid = (await import("mermaid")).default

        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "neutral",
          suppressErrorRendering: true,
          fontFamily: "var(--font-sans, sans-serif)",
          themeVariables: dark ? DARK_SECTIONS : LIGHT_SECTIONS,
        })

        const { svg: rendered } = await mermaid.render(renderId, chart)

        if (!cancelled) {
          setSvg(rendered)
          setFailed(false)
        }
      } catch {
        if (!cancelled) {
          setFailed(true)
        }
      }
    })()

    return () => {
      cancelled = true
      document.getElementById(`d${renderId}`)?.remove()
      document.getElementById(renderId)?.remove()
    }
  }, [chart, resolvedTheme])

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
        {chart}
      </pre>
    )
  }

  if (!svg) {
    return (
      <div
        className={cn(
          "h-56 w-full animate-pulse rounded-lg bg-muted/50",
          className
        )}
        aria-hidden
      />
    )
  }

  return (
    <div
      role="img"
      aria-label="Diagram"
      className={cn(
        "w-full overflow-x-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-full",
        className
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
