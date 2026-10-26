import type * as React from "react"

import {
  AhxApiVisual,
  AhxArchitecture,
  AhxLifecycleVisual,
  AhxPaymentStatesVisual,
  AlvysApiVisual,
  AlvysArchitecture,
  AutoTransportApiVisual,
  AutoTransportArchitecture,
  ContentSchemaVisual,
  DatabaseSchemaVisual,
  EdiPipelineVisual,
  DocumentPipelineVisual,
  AgentRunPipelineVisual,
  LoadLifecycleVisual,
  MatchingScoreVisual,
  OnulinkApiVisual,
  OnulinkArchitecture,
  OnulinkDeployPipelineVisual,
  OnulinkLifecycleVisual,
  OnulinkMarginFormula,
  OnulinkSettlementFormula,
  PricingFormulaVisual,
  type VisualProps,
} from "@/components/docs/visuals"

/**
 * Maps the normalized first line of a fenced code block to a rich visual.
 * Any fence that is not listed here falls back to a syntax-highlighted code block,
 * so no source data can be lost. When two blocks share a first line, the joined
 * first-two-lines key takes priority.
 */
export const codeVisuals: Record<string, React.ComponentType<VisualProps>> = {
  // AutoTransport AI
  "Customer / Admin / Carrier": AutoTransportArchitecture,
  "score(carrier, shipment) =": MatchingScoreVisual,
  "base_transport_cost = market_lane_rate(route, date, equipment)":
    PricingFormulaVisual,
  Article: ContentSchemaVisual,
  users: DatabaseSchemaVisual,
  "POST /api/quotes": AutoTransportApiVisual,

  // Alvys TMS
  "Web TMS (dispatch / accounting / analytics) Driver mobile app":
    AlvysArchitecture,
  Draft: LoadLifecycleVisual,
  "Partner transport (SFTP / AS2 / API, according to partner agreement)":
    EdiPipelineVisual,
  "Mobile/web upload": DocumentPipelineVisual,
  "Trigger (event / schedule / manual)": AgentRunPipelineVisual,
  "POST /api/v1/loads": AlvysApiVisual,

  // Onulink
  "PUBLIC USERS / CUSTOMERS / BROKERS": OnulinkArchitecture,
  "draft → planned → assigned → dispatched → at_pickup": OnulinkLifecycleVisual,
  "Developer commit": OnulinkDeployPipelineVisual,
  "gross_earnings = sum(load_pay_calculations)": OnulinkSettlementFormula,
  "gross_margin = customer_revenue - carrier_cost - directly_attributable_costs":
    OnulinkMarginFormula,

  // Auto Hauler Exchange (AHX)
  "PUBLIC INTERNET": AhxArchitecture,
  "draft → posted → booked → pickup_confirmed → in_transit": AhxLifecycleVisual,
  "Payment: not_due → pending_documents → under_review → approved":
    AhxPaymentStatesVisual,
}

/**
 * Disambiguation keys for blocks that share a first line: the first two
 * normalized lines joined with a newline.
 */
export const codeVisualPairs: Record<
  string,
  React.ComponentType<VisualProps>
> = {
  "POST /api/loads\nGET /api/loads?status=in_transit": OnulinkApiVisual,
  "POST /api/loads\nGET /api/loads?status=posted&origin=...": AhxApiVisual,
}

export function getVisual(lang: string, code: string) {
  const lines = code.split("\n")
  const normalize = (line: string) => line.replace(/\s+/g, " ").trim()
  const firstLine = normalize(lines[0] ?? "")
  const twoLines = `${firstLine}\n${normalize(lines[1] ?? "")}`
  return codeVisualPairs[twoLines] ?? codeVisuals[firstLine] ?? null
}
