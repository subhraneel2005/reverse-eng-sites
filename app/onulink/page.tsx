import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"

import { DocRenderer } from "@/components/docs/doc-renderer"
import { DocShell } from "@/components/docs/doc-shell"
import { parseMarkdown } from "@/lib/docs/parse"

export const metadata: Metadata = {
  title: "Onulink — Technical Reverse-Engineering Report",
  description:
    "Public-source reconstruction of onulink.com: architecture mind map, offline-first driver app, dispatch, photo inspections, VIN decoding, IFTA mileage, settlements, broker marketplace and API design.",
}

export default function OnulinkPage() {
  const doc = parseMarkdown(
    readFileSync(
      path.join(
        process.cwd(),
        "docs",
        "onulink_technical_reverse_engineering.md"
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
