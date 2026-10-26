import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"

import { DocRenderer } from "@/components/docs/doc-renderer"
import { DocShell } from "@/components/docs/doc-shell"
import { parseMarkdown } from "@/lib/docs/parse"

export const metadata: Metadata = {
  title: "Auto Hauler Exchange (AHX) — Technical Reverse-Engineering Report",
  description:
    "Public-source reconstruction of autohaulerexchange.com: architecture mind map, marketplace workflows, carrier compliance, bids and booking, market-estimate pricing, tracking, documents, payments and database design.",
}

export default function AhxPage() {
  const doc = parseMarkdown(
    readFileSync(
      path.join(process.cwd(), "docs", "ahx_technical_reverse_engineering.md"),
      "utf8"
    )
  )

  return (
    <DocShell toc={doc.toc}>
      <DocRenderer doc={doc} />
    </DocShell>
  )
}
