import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"

import { DocRenderer } from "@/components/docs/doc-renderer"
import { DocShell } from "@/components/docs/doc-shell"
import { parseMarkdown } from "@/lib/docs/parse"

export const metadata: Metadata = {
  title: "TruckTA — Technical Reverse-Engineering Report",
  description:
    "Public-source reconstruction of truckta.com: shared load record architecture, dispatch Active Board, offline driver app, finance and settlements, owner portal, FMCSA checks, imports and review-first AI.",
}

export default function TruckTaPage() {
  const doc = parseMarkdown(
    readFileSync(
      path.join(
        process.cwd(),
        "docs",
        "truckta_technical_reverse_engineering.md"
      ),
      "utf8"
    )
  )

  return (
    <DocShell toc={doc.toc}>
      <DocRenderer doc={doc} />
    </DocShell>
  )
}
