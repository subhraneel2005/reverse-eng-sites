import * as React from "react"
import {
  ArrowRight,
  Braces,
  Layers,
  ListTree,
  Milestone,
  Network,
  Table2,
  Workflow,
} from "lucide-react"

import { Mermaid } from "@/components/docs/mermaid"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type VisualProps = { code: string; lang: string }

function VisualFrame({
  icon,
  title,
  badge,
  description,
  children,
  bodyClassName,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  description?: string
  children: React.ReactNode
  bodyClassName?: string
}) {
  return (
    <Card className="my-6 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 pt-4 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-foreground">
            {icon}
          </span>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {badge ? (
            <Badge
              variant="outline"
              className="font-normal text-muted-foreground"
            >
              {badge}
            </Badge>
          ) : null}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("p-5", bodyClassName)}>{children}</CardContent>
    </Card>
  )
}

function FlowStrip({
  steps,
  label = "Data flow",
}: {
  steps: string[]
  label?: string
}) {
  return (
    <div className="mt-5 border-t pt-4">
      <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : null}
            <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Architecture mind maps                                             */
/* ------------------------------------------------------------------ */

const AUTOTRANSPORT_ARCHITECTURE = `mindmap
  root((AutoTransport AI))
    clients[Customer / Admin / Carrier]
    web[Web frontend · Next.js / React]
    api[Backend API · TypeScript / Node.js]
      pricing[Pricing engine]
      booking[Booking service]
      payments[Payments · Stripe]
      workflow[Shipment workflow + status history]
    store[PostgreSQL database]
      queue[Queue · jobs/events]
      objects[Object storage]
      search[Search / cache · optional]
    workers[Background workers]
      carrier[Carrier APIs]
      email[Email / SMS provider]
      track[Tracking provider]
      insurance[Insurance provider]
    admin[Admin dashboard + audit logs + monitoring]`

const ALVYS_ARCHITECTURE = `mindmap
  root((Alvys-like TMS))
    channels[Channels]
      webTms[Web TMS · dispatch / accounting / analytics]
      driverApp[Driver mobile app]
      api[API · AuthN / tenant / permissions]
    core[Core TMS domain]
      loads[Loads / stops]
      dispatch[Dispatch / assignments]
      drivers[Drivers / assets]
      documents[Documents]
      billing[Billing / settlements]
      complianceCore[Compliance]
    integrations[Integration platform]
      edi[EDI engine]
      connectors[Partner connectors]
      webhooks[Webhooks / polling]
      mapping[Mapping / config UI]
      retry[Retry + dead letters]
    ai[AI platform]
      extraction[Document extraction]
      insights[Insights / NL queries]
      agents[Agent runtime / Foundry]
      gateway[Model gateway / policy]
      mcp[MCP server]
    events[Durable events / jobs]
    storage[Data & storage]
      opdb[Operational database · tenant-scoped records]
      files[Object / file storage · BOL / POD / images]
      analytics[Analytics / search · reports, indexing]
    external[External systems and data providers]
      eld[ELD / GPS]
      boards[Load boards]
      accounting[Accounting]
      complianceExt[Compliance]
      weather[Weather / traffic]`

export function AutoTransportArchitecture() {
  return (
    <VisualFrame
      icon={<Network className="size-4" />}
      title="Plausible system architecture"
      badge="Mind map"
      description="Recommended reconstruction — a modular monolith that can split into services only when scaling or team ownership demands it."
    >
      <Mermaid chart={AUTOTRANSPORT_ARCHITECTURE} className="py-2" />
      <FlowStrip
        steps={[
          "Customer / Admin / Carrier",
          "Web frontend",
          "Backend API",
          "PostgreSQL database",
          "Queue · Object storage · Search/cache",
          "Background workers",
          "Carrier · Email/SMS · Tracking · Insurance",
          "Admin dashboard + audit logs + monitoring",
        ]}
      />
    </VisualFrame>
  )
}

export function AlvysArchitecture() {
  return (
    <VisualFrame
      icon={<Network className="size-4" />}
      title="Likely high-level architecture"
      badge="Mind map"
      description="Recommended reconstruction built around a shared, tenant-scoped operational data model."
    >
      <Mermaid chart={ALVYS_ARCHITECTURE} className="py-2" />
      <FlowStrip
        steps={[
          "Web TMS · Driver mobile app",
          "API · AuthN / tenant / permissions",
          "Core TMS · Integration · AI platform",
          "Durable events / jobs",
          "Operational DB · Object storage · Analytics/search",
          "External systems: ELD/GPS · load boards · accounting · compliance · weather/traffic",
        ]}
      />
    </VisualFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Formula visuals                                                    */
/* ------------------------------------------------------------------ */

function FormulaVisual({
  code,
  title,
  badge,
  description = "Each term is a documented, versioned adjustment — not a hidden multiplier.",
}: VisualProps & { title: string; badge: string; description?: string }) {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const header = lines[0]?.endsWith("=") ? lines[0].slice(0, -1).trim() : null
  const expression = (header ? lines.slice(1) : lines).map((line) => {
    const match = /^([+-])\s+(.*)$/.exec(line)
    return match
      ? { sign: match[1] as "+" | "-", text: match[2].replace(/\s+/g, " ") }
      : { sign: null as "+" | "-" | null, text: line.replace(/\s+/g, " ") }
  })

  return (
    <VisualFrame
      icon={<Braces className="size-4" />}
      title={title}
      badge={badge}
      description={description}
    >
      <div className="rounded-lg border bg-muted/20 p-4 font-mono text-sm">
        {header ? (
          <p className="mb-3 border-b border-dashed pb-3 text-base font-semibold">
            {header}{" "}
            <span className="font-normal text-muted-foreground">=</span>
          </p>
        ) : null}
        <ul className="space-y-2">
          {expression.map((row, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold",
                  row.sign === "+"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : row.sign === "-"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-border bg-background text-muted-foreground"
                )}
                aria-hidden
              >
                {row.sign ?? "="}
              </span>
              <span className="min-w-0 break-words">{row.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </VisualFrame>
  )
}

export function MatchingScoreVisual(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Carrier × shipment matching score"
      badge="Scoring formula"
    />
  )
}

export function PricingFormulaVisual(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Rules-based pricing formula (Phase 1)"
      badge="Pricing engine"
    />
  )
}

/* ------------------------------------------------------------------ */
/* Pipeline / lifecycle visuals                                       */
/* ------------------------------------------------------------------ */

function PipelineVisual({
  code,
  title,
  badge,
  description,
}: VisualProps & { title: string; badge: string; description?: string }) {
  const steps = code
    .split("\n")
    .map((line) => line.trim().replace(/^(?:->|→|↓)\s*/, ""))
    .filter((line) => line.length > 0 && !/^[↓↑←→|+\-–—\s]+$/.test(line))

  return (
    <VisualFrame
      icon={<Workflow className="size-4" />}
      title={title}
      badge={badge}
      description={description}
    >
      <ol className="relative space-y-4 pl-9">
        <span
          className="absolute top-3 bottom-3 left-3 w-px bg-border"
          aria-hidden
        />
        {steps.map((step, index) => (
          <li key={index} className="relative">
            <span
              className={cn(
                "absolute -left-9 flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                index === 0 || index === steps.length - 1
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "block text-sm leading-6",
                index === 0 ? "font-medium" : "text-foreground/85"
              )}
            >
              {step}
            </span>
          </li>
        ))}
      </ol>
    </VisualFrame>
  )
}

export function EdiPipelineVisual(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Native EDI message pipeline"
      badge="Flow"
      description="Inbound bytes become idempotent domain commands; permanent failures go to a review queue."
    />
  )
}

export function DocumentPipelineVisual(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Document scanning → AI load creation"
      badge="Flow"
      description="OCR output is evidence, not truth: low-confidence fields are routed to human review."
    />
  )
}

export function AgentRunPipelineVisual(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Foundry agent run loop"
      badge="Flow"
      description="Tools are schema-validated; writes go through domain services, approvals and audit trails."
    />
  )
}

export function LoadLifecycleVisual({
  code,
  title,
}: VisualProps & { title?: string }) {
  const steps = code
    .replace(/↘[^\n]*/g, "")
    .split(/\s*(?:->|→)\s*/)
    .map((step) => step.trim())
    .filter(Boolean)

  return (
    <VisualFrame
      icon={<Milestone className="size-4" />}
      title={title ?? "Load lifecycle"}
      badge="State machine"
      description="Transitions are explicit and validated server-side; exception states (cancelled, rejected, late, on hold, missing paperwork, disputed charges) branch off this happy path."
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                index === steps.length - 1
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-background"
              )}
            >
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </VisualFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Schema / table visuals                                             */
/* ------------------------------------------------------------------ */

export function ContentSchemaVisual({
  code,
  title,
}: VisualProps & { title?: string }) {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const groups: { name: string; fields: string[] }[] = []
  for (const line of lines) {
    if (line.startsWith("- ")) {
      const group = groups[groups.length - 1]
      if (group) {
        group.fields.push(line.slice(2))
        continue
      }
    }
    groups.push({ name: line, fields: [] })
  }

  return (
    <VisualFrame
      icon={<ListTree className="size-4" />}
      title={title ?? "Content data model"}
      badge="Schema"
      description="Stored as MDX/Markdown or a CMS reference; index slug, status, publication date and category for large collections."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.name} className="rounded-lg border bg-card">
            <div className="border-b bg-muted/40 px-3 py-2 font-mono text-xs font-semibold">
              {group.name}
            </div>
            <ul className="divide-y">
              {group.fields.map((field) => (
                <li
                  key={field}
                  className="px-3 py-1.5 font-mono text-xs break-words text-foreground/85"
                >
                  {field}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </VisualFrame>
  )
}

export function DatabaseSchemaVisual({
  code,
  title,
}: VisualProps & { title?: string }) {
  const tables = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <VisualFrame
      icon={<Layers className="size-4" />}
      title={title ?? "Suggested database schema"}
      badge={`${tables.length} tables`}
      description="Money uses integer minor units (cents) or a careful decimal type — never floating point; currency is stored explicitly."
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => (
          <li
            key={table}
            className="truncate rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
            title={table}
          >
            {table}
          </li>
        ))}
      </ul>
    </VisualFrame>
  )
}

const METHOD_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  GET: "secondary",
  POST: "default",
  PATCH: "outline",
  PUT: "outline",
  DELETE: "destructive",
}

function ApiTableVisual({
  code,
  title,
  description,
}: VisualProps & { title: string; description?: string }) {
  const rows = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [method, ...rest] = line.split(/\s+/)
      return { method: method.toUpperCase(), path: rest.join(" ") }
    })

  return (
    <VisualFrame
      icon={<Table2 className="size-4" />}
      title={title}
      badge={`${rows.length} endpoints`}
      description={description}
    >
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-24">Method</TableHead>
              <TableHead>Endpoint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.method}-${row.path}-${index}`}>
                <TableCell>
                  <Badge
                    variant={METHOD_VARIANT[row.method] ?? "outline"}
                    className="font-mono text-[10px]"
                  >
                    {row.method}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {row.path}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </VisualFrame>
  )
}

export function AutoTransportApiVisual(props: VisualProps) {
  return (
    <ApiTableVisual
      {...props}
      title="API contract sketch"
      description="Illustrative endpoints: validate with Zod, authenticate every private route, verify webhook signatures, and use idempotency keys for booking/payment operations."
    />
  )
}

export function AlvysApiVisual(props: VisualProps) {
  return (
    <ApiTableVisual
      {...props}
      title="Example API routes"
      description="Versioned, typed routes for your own system — cursor pagination, idempotency keys, correlation IDs and HMAC-signed webhooks."
    />
  )
}

/* ------------------------------------------------------------------ */
/* Onulink                                                             */
/* ------------------------------------------------------------------ */

const ONULINK_ARCHITECTURE = `mindmap
  root((Onulink-like TMS))
    clients[Public users / customers / brokers]
    edge[DNS + TLS + CDN / WAF]
    marketing[Marketing website · pages / pricing / CMS]
    tms[TMS web app · dispatch / admin / broker]
    api[Authenticated HTTPS API]
      modules[Domain modules]
      realtime[Realtime gateway · WebSocket / SSE]
      workers[Job workers · notifications, PDFs, OCR, sync]
    db[Managed PostgreSQL · geospatial]
    files[Private object storage · photos, signatures, BOLs, receipts]
    adapters[Integration adapters]
      maps[Maps / geocoding]
      billing[Billing / payments · Stripe]
      vin[VIN decoder / OCR]
    mobile[Driver mobile app]
      local[Local database + file queue]
      sensors[Camera / barcode / GPS / push]`

export function OnulinkArchitecture() {
  return (
    <VisualFrame
      icon={<Network className="size-4" />}
      title="Product architecture at a glance"
      badge="Mind map"
      description="Recommended architecture for a similar product — a modular monolith behind CDN/WAF, with an offline-first driver app on top."
    >
      <Mermaid chart={ONULINK_ARCHITECTURE} className="py-2" />
      <FlowStrip
        steps={[
          "Public users / customers / brokers",
          "DNS + TLS + CDN / WAF",
          "Marketing website + TMS web application",
          "Authenticated HTTPS API",
          "Domain modules · Realtime gateway · Job workers",
          "PostgreSQL + geospatial · Object storage",
          "Maps · Billing · VIN/OCR adapters",
          "Driver mobile app · local DB + file queue",
        ]}
      />
    </VisualFrame>
  )
}

export function OnulinkLifecycleVisual(props: VisualProps) {
  return <LoadLifecycleVisual {...props} title="Example load lifecycle" />
}

export function OnulinkDeployPipelineVisual(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Typical deployment flow"
      badge="Pipeline"
      description="Staging with smoke tests and migration checks gates every production deploy — mobile clients may stay on older versions for weeks."
    />
  )
}

export function OnulinkSettlementFormula(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Driver settlement calculation"
      badge="Settlements"
    />
  )
}

export function OnulinkMarginFormula(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Brokerage margin calculation"
      badge="Financials"
    />
  )
}

export function OnulinkApiVisual(props: VisualProps) {
  return (
    <ApiTableVisual
      {...props}
      title="API design examples"
      description="Illustrative endpoints for a new product — validate server-side, use idempotency keys for retried operations, cursor pagination and correlation IDs."
    />
  )
}

/* ------------------------------------------------------------------ */
/* Auto Hauler Exchange (AHX)                                          */
/* ------------------------------------------------------------------ */

const AHX_ARCHITECTURE = `mindmap
  root((AHX-like marketplace))
    internet[Public internet]
    edge[DNS + TLS + CDN / WAF]
    marketing[Marketing website · Webflow or CMS]
    market[Marketplace web app · React / Next.js]
    api[HTTPS JSON API · application layer]
      postgres[PostgreSQL · business data]
      queue[Job queue / workers]
      storage[Object storage · private files]
      auth[Auth service · sessions / MFA]
    adapters[External integration adapters]
      vetting[Carrier vetting / compliance]
      tracking[GPS / ELD tracking]
      notify[Email / SMS notifications]
      payments[Payments / ACH processor]
    services[Pricing / risk / analytics services]`

export function AhxArchitecture() {
  return (
    <VisualFrame
      icon={<Network className="size-4" />}
      title="Likely system architecture"
      badge="Mind map"
      description="Recommended architecture for a comparable product — marketing site and marketplace app deployed separately, with vetting/tracking/payment adapters behind the API."
    >
      <Mermaid chart={AHX_ARCHITECTURE} className="py-2" />
      <FlowStrip
        steps={[
          "Public internet · DNS + TLS + CDN / WAF",
          "Marketing website + Marketplace web app",
          "HTTPS JSON API · application layer",
          "PostgreSQL · Job queue · Object storage · Auth",
          "Carrier vetting · GPS/ELD · Email/SMS · Payments/ACH",
          "Pricing / risk / analytics services",
        ]}
      />
    </VisualFrame>
  )
}

export function AhxLifecycleVisual(props: VisualProps) {
  return <LoadLifecycleVisual {...props} title="Recommended load states" />
}

export function AhxPaymentStatesVisual({ code }: VisualProps) {
  const [main = "", ...exceptionParts] = code.split("↘")
  const exceptions = exceptionParts
    .join(" ")
    .split(/\s*\/\s*/)
    .map((state) => state.trim())
    .filter(Boolean)
  const steps = main
    .replace(/^Payment:\s*/i, "")
    .split(/\s*(?:->|→)\s*/)
    .map((step) => step.trim())
    .filter(Boolean)

  return (
    <VisualFrame
      icon={<Milestone className="size-4" />}
      title="Payment lifecycle"
      badge="State machine"
      description="Payment status is tracked separately from shipment status; a payment is only paid on the provider's confirmed state, reconciled against provider reports."
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                index === steps.length - 1
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-background"
              )}
            >
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              {step}
            </span>
          </li>
        ))}
      </ol>
      {exceptions.length > 0 ? (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Exception / branch states
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {exceptions.map((state) => (
              <li
                key={state}
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
              >
                {state}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </VisualFrame>
  )
}

export function AhxApiVisual(props: VisualProps) {
  return (
    <ApiTableVisual
      {...props}
      title="Example API shape"
      description="Booking endpoints must be idempotent and transactional — two carriers cannot successfully book the same load."
    />
  )
}

/* ------------------------------------------------------------------ */
/* TruckTA                                                             */
/* ------------------------------------------------------------------ */

const TRUCKTA_ARCHITECTURE = `mindmap
  root((TruckTA-like TMS))
    shared[One canonical load record]
    dispatch[Dispatch Active Board]
      board[Driver rows · date cards · load cards]
      conflict[Realtime updates · draft-conflict handling]
    driver[Driver mobile app · iOS / Android]
      queue[Offline mutation queue · idempotency keys]
      evidence[VIN scans · inspections · eBOL · photos]
    finance[Finance center]
      ar[A/R · invoices · payments · aging]
      settle[Driver + owner settlements · frozen snapshots]
    portal[Owner portal · server-side fleet scoping]
    compliance[Compliance center]
      fmcsa[FMCSA checks · evidence + freshness]
      expiry[Document expiry · audit packets]
    imports[Imports · CSV / rate-conf PDF · Chrome extension · email]
    ai[AI assistance · review-first extraction + Q&A]`

export function TruckTaLifecycleVisual({ code }: VisualProps) {
  const states: { label: string; caption?: string }[] = []
  let pendingCaption: string | undefined

  for (const raw of code.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    if (/^[|v+\-–—\s]+$/.test(line)) continue

    if (line.startsWith("|")) {
      const caption = line.replace(/^\|+\s*/, "").trim()
      if (caption) pendingCaption = caption
      continue
    }

    states.push({ label: line, caption: pendingCaption })
    pendingCaption = undefined
  }

  return (
    <VisualFrame
      icon={<Network className="size-4" />}
      title="One shared load record"
      badge="Architecture + lifecycle"
      description="Dispatch, driver, finance, owner and compliance apps all reference the same canonical load; stages are calculated from recorded events, not picked from a dropdown."
    >
      <Mermaid chart={TRUCKTA_ARCHITECTURE} className="py-2" />
      <FlowStrip
        steps={[
          "One canonical load record",
          "Dispatch Active Board + Driver mobile app",
          "Finance · invoices, payments, settlements",
          "Owner portal · server-side fleet scoping",
          "Compliance · FMCSA + expiry reminders",
          "Imports + review-first AI",
        ]}
      />
      <div className="mt-5 border-t pt-4">
        <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Example load lifecycle
        </p>
        <ol className="relative space-y-4 pl-9">
          <span
            className="absolute top-3 bottom-3 left-3 w-px bg-border"
            aria-hidden
          />
          {states.map((state, index) => (
            <li key={state.label} className="relative">
              <span
                className={cn(
                  "absolute -left-9 flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                  index >= states.length - 2
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-background text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span className="block text-sm leading-6 font-medium">
                {state.label}
              </span>
              {state.caption ? (
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  via {state.caption}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </VisualFrame>
  )
}

export function TruckTaStatusVisual({ code }: VisualProps) {
  const groups: { name: string; main: string[]; exceptions: string[] }[] = []
  let current: (typeof groups)[number] | null = null
  let sawMainLine = false

  for (const raw of code.split("\n")) {
    const line = raw.trim()
    if (!line) continue

    if (line.endsWith(":") && !line.includes("|")) {
      current = { name: line.slice(0, -1), main: [], exceptions: [] }
      sawMainLine = false
      groups.push(current)
      continue
    }

    if (!current) continue

    const parts = line
      .replace(/^\|/, "")
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean)

    if (!sawMainLine) {
      current.main.push(...parts)
      sawMainLine = true
    } else {
      current.exceptions.push(...parts)
    }
  }

  return (
    <VisualFrame
      icon={<Milestone className="size-4" />}
      title="Operational and receivable status"
      badge="State machines"
      description="Two separate state machines on one load: operational progress and financial receivable status — never a single overloaded column."
    >
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.name}>
            <p className="mb-2.5 font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.name}
            </p>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
              {group.main.map((state, index) => (
                <li key={state} className="flex items-center gap-1.5">
                  {index > 0 ? (
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    {state}
                  </span>
                </li>
              ))}
            </ol>
            {group.exceptions.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {group.exceptions.map((state) => (
                  <li
                    key={state}
                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                  >
                    {state}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </VisualFrame>
  )
}

export function TruckTaRealtimeFlow(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Realtime Active Board event flow"
      badge="Event flow"
      description="A transactional outbox keeps database commits and event publication aligned; clients refetch authoritative data after reconnecting."
    />
  )
}

export function TruckTaCapacityFormula(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Trailer capacity calculation"
      badge="Capacity"
      description="One load can carry multiple vehicles — capacity counts vehicles overlapping a delivery date, not load records."
    />
  )
}

export function TruckTaInspectionPipeline(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Inspection → eBOL pipeline"
      badge="Flow"
      description="Originals are preserved; signatures store signer, hash, timestamp and consent evidence — a drawn signature alone is not an audit trail."
    />
  )
}

export function TruckTaBalanceFormula(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Outstanding balance"
      badge="Payment ledger"
      description="Payments are immutable ledger rows; corrections reverse and reference the original, never overwrite it."
    />
  )
}

export function TruckTaDriverPayFormula(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Net driver pay"
      badge="Settlements"
      description="Pay rules (percentage, flat per load, salary) are explicit configuration; approval freezes a snapshot of the source lines."
    />
  )
}

export function TruckTaOwnerPayFormula(props: VisualProps) {
  return (
    <FormulaVisual
      {...props}
      title="Net to fleet owner"
      badge="Settlements"
      description="Recurring charges carry effective dates and frequency; settlement jobs are idempotent against double-application."
    />
  )
}

export function TruckTaLocationPipeline(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="Consent-based location pipeline"
      badge="Flow"
      description="Device time is stored separately from server receipt time; retention jobs delete history on schedule and implausible jumps are flagged, not invented."
    />
  )
}

export function TruckTaCsvImportPipeline(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="CSV import pipeline"
      badge="Flow"
      description="Preview and revalidation at commit time — the database can change between preview and confirmation; rejected rows download for fixing."
    />
  )
}

export function TruckTaExtractionPipeline(props: VisualProps) {
  return (
    <PipelineVisual
      {...props}
      title="AI rate-confirmation extraction"
      badge="Flow"
      description="Deterministic parsing first, LLM only when needed; the output is a draft load until a human reviews and approves it."
    />
  )
}

export function TruckTaApiVisual(props: VisualProps) {
  return (
    <ApiTableVisual
      {...props}
      title="API outline for a comparable product"
      description="Command endpoints for high-value writes: authenticate, authorize, validate, check version, commit, audit, publish, return canonical state."
    />
  )
}
