import type { LucideIcon } from "lucide-react"
import { Boxes, Handshake, Smartphone, Truck } from "lucide-react"

import { getVisual } from "@/components/docs/overrides"
import type { ParsedDoc } from "@/lib/docs/parse"

export interface ReportMeta {
  slug: string
  href: string
  file: string
  name: string
  target: string
  researchDate: string
  summary: string
  highlights: string[]
  icon: LucideIcon
}

export const REPORTS: ReportMeta[] = [
  {
    slug: "autotransport-ai",
    href: "/autotransport-ai",
    file: "autotransport_ai_technical_reverse_engineering.md",
    name: "AutoTransport AI",
    target: "autotransportai.com",
    researchDate: "26 October 2026",
    icon: Truck,
    summary:
      "A digital auto-transport broker/platform: instant route quotes, $0 charged at booking with capture at pickup, Highway carrier verification, shipment tracking, and AI agents across quoting, matching, tracking, support and payments — wrapped in a large SEO/content layer.",
    highlights: [
      "Three products in one: marketing/SEO site + transactional marketplace + operations platform",
      "Pricing engine roadmap: rules first, real quote/outcome data second, ML only when data supports it",
      "“$0 today, charge at pickup” modelled with Stripe SetupIntents and verified pickup events",
      "Documents its public inconsistencies: 25% vs 30/35% multipliers, 1,000+ vs 5,000+ carriers",
    ],
  },
  {
    slug: "alvys-tms",
    href: "/alvys-tms",
    file: "alvys_tms_technical_reverse_engineering.md",
    name: "Alvys TMS",
    target: "alvys.com",
    researchDate: "26 October 2026",
    icon: Boxes,
    summary:
      "A cloud transportation management system unifying load lifecycle, dispatch, drivers/assets, document capture, native EDI, 120+ integrations, accounting/settlement, analytics and AI (Alvys Intelligence + Foundry agents) on one shared, tenant-scoped operational data model.",
    highlights: [
      "Stack evidenced by job listings: .NET/C#, Cosmos DB, Azure, TypeScript, Angular/React, Flutter",
      "Native EDI with transaction sets 204, 210, 213, 214, 824, 990, 997 and configurable mappings",
      "Foundry agent loop: trigger → typed tools → policy check → human approval → audit trail",
      "Core lesson of the report: data and workflow integration first, AI second",
    ],
  },
  {
    slug: "onulink",
    href: "/onulink",
    file: "onulink_technical_reverse_engineering.md",
    name: "Onulink",
    target: "onulink.com",
    researchDate: "26 October 2026",
    icon: Smartphone,
    summary:
      "A vertical TMS for auto haulers with a connected driver mobile app and a broker-to-carrier marketplace: dispatch, offline inspections with damage diagrams, VIN decoding, IFTA mileage, fuel-receipt OCR, driver settlements and a broker load board with auto-accept bidding.",
    highlights: [
      "Offline-first driver app: local outbox, idempotent sync, photo/signature capture with no signal",
      "Broker marketplace hides customer/VIN details server-side until booking — DTOs, not CSS",
      "Driver pay as versioned, deterministic settlement plans; finalized settlements stay immutable",
      "IFTA mileage treated as an auditable data pipeline, not a line drawn on a map",
    ],
  },
  {
    slug: "ahx",
    href: "/ahx",
    file: "ahx_technical_reverse_engineering.md",
    name: "Auto Hauler Exchange",
    target: "autohaulerexchange.com",
    researchDate: "26 October 2026",
    icon: Handshake,
    summary:
      "A two-sided vehicle-transport marketplace connecting shippers with vetted carriers: direct booking and bidding, Highway carrier compliance, market-estimate pricing, live tracking with Macropoint fallback, document-gated payments and Quick Pay.",
    highlights: [
      "Two connected products: Webflow marketing site + separate marketplace subdomain app",
      "Carrier vetting as a compliance state machine with provider checks, expiry monitoring and appeals",
      "Booking concurrency enforced in the database — two carriers cannot win the same load",
      "Payments separated from shipment status with a ledger and document-approval gates",
    ],
  },
]

export interface ReportStats {
  sections: number
  subsections: number
  tables: number
  diagrams: number
}

export function reportStats(doc: ParsedDoc): ReportStats {
  const all = [...doc.preamble, ...doc.blocks]

  return {
    sections: all.filter(
      (block) => block.type === "heading" && block.level === 2
    ).length,
    subsections: all.filter(
      (block) => block.type === "heading" && block.level === 3
    ).length,
    tables: all.filter((block) => block.type === "table").length,
    diagrams: all.filter(
      (block) => block.type === "code" && getVisual(block.lang, block.code)
    ).length,
  }
}
