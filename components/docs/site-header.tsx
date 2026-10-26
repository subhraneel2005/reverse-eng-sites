"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BookOpen,
  Boxes,
  ClipboardList,
  FileCode2,
  Handshake,
  Moon,
  Smartphone,
  Sun,
  Truck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: BookOpen },
  { href: "/autotransport-ai", label: "AutoTransport AI", icon: Truck },
  { href: "/alvys-tms", label: "Alvys TMS", icon: Boxes },
  { href: "/onulink", label: "Onulink", icon: Smartphone },
  { href: "/ahx", label: "AHX", icon: Handshake },
  { href: "/truckta", label: "TruckTA", icon: ClipboardList },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4 md:px-6">
        <Link href="/" className="mr-1 flex shrink-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileCode2 className="size-4" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            Reverse-Engineering Docs
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="block dark:hidden" />
        </Button>
      </div>
    </header>
  )
}
