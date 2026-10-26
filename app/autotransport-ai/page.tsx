import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"

import { DocRenderer } from "@/components/docs/doc-renderer"
import { DocShell } from "@/components/docs/doc-shell"
import { parseMarkdown } from "@/lib/docs/parse"

export const metadata: Metadata = {
  title: "AutoTransport AI — Technical Reverse-Engineering Report",
  description:
    "Black-box reverse-engineering of autotransportai.com: architecture mind map, pricing engine, backend modules, payments at pickup, data model, API contract and build roadmap.",
}

export default function AutoTransportAiPage() {
  const doc = parseMarkdown(
    readFileSync(
      path.join(
        process.cwd(),
        "docs",
        "autotransport_ai_technical_reverse_engineering.md"
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
