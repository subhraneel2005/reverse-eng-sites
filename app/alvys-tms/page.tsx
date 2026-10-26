import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"

import { DocRenderer } from "@/components/docs/doc-renderer"
import { DocShell } from "@/components/docs/doc-shell"
import { parseMarkdown } from "@/lib/docs/parse"

export const metadata: Metadata = {
  title: "Alvys TMS — Technical Reverse-Engineering Report",
  description:
    "Public-source reconstruction of alvys.com: architecture mind map, load lifecycle, native EDI pipeline, integrations, document AI, Foundry agents, API design and database schema.",
}

export default function AlvysTmsPage() {
  const doc = parseMarkdown(
    readFileSync(
      path.join(
        process.cwd(),
        "docs",
        "alvys_tms_technical_reverse_engineering.md"
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
