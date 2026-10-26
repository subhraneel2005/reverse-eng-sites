import * as React from "react"

import { TocNav } from "@/components/docs/toc-nav"
import type { TocEntry } from "@/lib/docs/parse"

export function DocShell({
  toc,
  children,
}: {
  toc: TocEntry[]
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] gap-10 px-4 md:px-6">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto py-10">
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            On this page
          </p>
          <TocNav entries={toc} />
        </div>
      </aside>

      <main className="max-w-4xl min-w-0 flex-1 py-8 md:py-10">
        <details className="mb-8 rounded-xl border bg-muted/30 lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none">
            On this page
            <span className="float-right text-xs font-normal text-muted-foreground">
              {toc.length} sections
            </span>
          </summary>
          <div className="border-t px-4 py-3">
            <TocNav entries={toc} />
          </div>
        </details>

        {children}
      </main>
    </div>
  )
}
