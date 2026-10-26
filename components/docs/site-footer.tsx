import { Kbd } from "@/components/ui/kbd"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[1500px] flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center md:px-6">
        <p>
          Black-box public-source analysis — not affiliated with, and not a
          claim about, the products described.
        </p>
        <p className="flex items-center gap-1.5">
          Press <Kbd>d</Kbd> to toggle dark mode
        </p>
      </div>
    </footer>
  )
}
