"use client"

import * as React from "react"

import type { TocEntry } from "@/lib/docs/parse"
import { cn } from "@/lib/utils"

export function TocNav({
  entries,
  className,
}: {
  entries: TocEntry[]
  className?: string
}) {
  const [activeId, setActiveId] = React.useState<string>(entries[0]?.id ?? "")

  React.useEffect(() => {
    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (observations) => {
        for (const observation of observations) {
          if (observation.isIntersecting) {
            visible.add(observation.target.id)
          } else {
            visible.delete(observation.target.id)
          }
        }

        const next = entries.find((entry) => visible.has(entry.id))
        if (next) {
          setActiveId(next.id)
        }
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 }
    )

    for (const entry of entries) {
      const element = document.getElementById(entry.id)
      if (element) observer.observe(element)
    }

    return () => observer.disconnect()
  }, [entries])

  return (
    <nav aria-label="Table of contents" className={className}>
      <ul className="border-l border-border">
        {entries.map((entry) => {
          const active = entry.id === activeId
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "-mt-px block border-l py-1.5 text-sm transition-colors",
                  entry.level === 2 ? "pl-3" : "pl-7 text-[13px]",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {entry.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
