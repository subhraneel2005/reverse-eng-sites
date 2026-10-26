import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Compass, ShieldAlert, Sparkles } from "lucide-react"

import { parseMarkdown } from "@/lib/docs/parse"
import { REPORTS, reportStats } from "@/lib/docs/reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title:
    "Reverse-Engineering Reports — AutoTransport AI, Alvys TMS, Onulink & AHX",
  description:
    "Visual reverse-engineering documentation for autotransportai.com, alvys.com, onulink.com and autohaulerexchange.com: architecture mind maps, data models, API contracts, pipelines and build roadmaps.",
}

function loadReport(file: string) {
  return parseMarkdown(
    readFileSync(path.join(process.cwd(), "docs", file), "utf8")
  )
}

const READING_GUIDE = [
  {
    label: "Observed",
    definition: "stated in public website text or public terms.",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    label: "Likely implementation",
    definition:
      "a technically plausible way to implement the advertised behaviour.",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  {
    label: "Unverified",
    definition:
      "the website does not publicly prove that a specific implementation exists or that every marketing claim is backed by a live integration.",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
]

export default function HomePage() {
  const docs = REPORTS.map((report) => ({
    report,
    doc: loadReport(report.file),
  }))

  const totals = {
    sections: docs.reduce(
      (sum, entry) => sum + reportStats(entry.doc).sections,
      0
    ),
    tables: docs.reduce((sum, entry) => sum + reportStats(entry.doc).tables, 0),
    diagrams: docs.reduce(
      (sum, entry) => sum + reportStats(entry.doc).diagrams,
      0
    ),
  }

  return (
    <main>
      {/* Hero */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-[1500px] px-4 py-14 md:px-6 md:py-20">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-5">
              <Sparkles /> Public-source reverse engineering
            </Badge>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
              Freight-tech products, taken apart —{" "}
              <span className="text-primary">visualized</span>.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              The reverse-engineering markdown reports rebuilt as a
              documentation site: shadcn/ui tables for every data table, mind
              maps for every architecture diagram, and step visuals for every
              pipeline — with no source data removed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {REPORTS.map((report) => {
                const Icon = report.icon

                return (
                  <Button
                    key={report.slug}
                    render={<Link href={report.href} />}
                    nativeButton={false}
                    size="lg"
                  >
                    <Icon className="size-4" />
                    {report.name} report
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
          {[
            { value: REPORTS.length, label: "Reverse-engineering reports" },
            { value: totals.sections, label: "Top-level sections" },
            {
              value: totals.tables,
              label: "Data tables rendered as shadcn tables",
            },
            {
              value: totals.diagrams,
              label: "Diagrams rebuilt as visuals / mind maps",
            },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-6 md:px-6">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reports */}
      <section className="mx-auto max-w-[1500px] px-4 py-12 md:px-6 md:py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              The reports
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Separate routes, separate documentation — pick a product.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {docs.map(({ report, doc }) => {
            const stats = reportStats(doc)
            const Icon = report.icon

            return (
              <Card key={report.slug} className="flex flex-col overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {report.target} · researched {report.researchDate}
                      </p>
                    </div>
                  </div>
                  <CardDescription className="mt-1 leading-6">
                    {report.summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {report.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex gap-2.5 text-sm leading-6"
                      >
                        <Check className="mt-1 size-4 shrink-0 text-primary" />
                        <span className="text-foreground/85">{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant="secondary">{stats.sections} sections</Badge>
                    <Badge variant="secondary">
                      {stats.subsections} subsections
                    </Badge>
                    <Badge variant="secondary">{stats.tables} tables</Badge>
                    <Badge variant="secondary">{stats.diagrams} diagrams</Badge>
                  </div>
                </CardContent>

                <CardFooter className="border-t pt-4">
                  <Button
                    render={<Link href={report.href} />}
                    nativeButton={false}
                    className="w-full sm:w-auto"
                  >
                    Open full report
                    <ArrowRight className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>

      <Separator />

      {/* Reading guide */}
      <section className="mx-auto max-w-[1500px] px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Compass className="size-5 text-primary" />
              How to read these reports
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every report is a black-box analysis of public pages. They
              separate what is provable from what is inference — the labels are
              defined the same way in each document:
            </p>

            <ul className="mt-5 space-y-3">
              {READING_GUIDE.map((entry) => (
                <li
                  key={entry.label}
                  className="flex flex-wrap items-start gap-3"
                >
                  <Badge variant="outline" className={entry.className}>
                    <span className={`size-1.5 rounded-full ${entry.dot}`} />
                    {entry.label}
                  </Badge>
                  <span className="min-w-0 flex-1 text-sm leading-6 text-foreground/85">
                    {entry.definition}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="size-4 text-destructive" />
                Important boundary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              This is a public-source reconstruction — not access to private
              source code, infrastructure, production APIs or internal
              architecture. Proposed implementation details are a blueprint for
              building a similar product, not claims about the companies’ exact
              internals.
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
