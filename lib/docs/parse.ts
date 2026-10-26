export type TocEntry = { id: string; text: string; level: 2 | 3 }

export type Block =
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "paragraph"; text: string }
  | {
      type: "list"
      ordered: boolean
      items: { marker: string; text: string }[]
    }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "quote"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "rule" }

export interface ParsedDoc {
  title: string
  toc: TocEntry[]
  /** Blocks that appear before the first `## ` heading (title metadata, boundary notes). */
  preamble: Block[]
  /** Blocks from the first `## ` heading onwards. */
  blocks: Block[]
}

export function slugify(text: string, used: Map<string, number>) {
  const base =
    text
      .toLowerCase()
      .replace(/`/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"

  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

const FENCE_RE = /^```([a-zA-Z0-9+-]*)\s*$/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const LIST_RE = /^(\d+[.)]|[-*])\s+(.*)$/
const HR_RE = /^-{3,}\s*$/
const QUOTE_RE = /^>\s?/
const TABLE_SEP_RE = /^\|?[\s:|-]+\|?$/

function startsBlock(line: string) {
  return (
    FENCE_RE.test(line) ||
    HEADING_RE.test(line) ||
    LIST_RE.test(line) ||
    QUOTE_RE.test(line) ||
    HR_RE.test(line) ||
    (line.startsWith("|") && line.includes("-"))
  )
}

function splitRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

export function parseMarkdown(markdown: string): ParsedDoc {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  const toc: TocEntry[] = []
  const usedSlugs = new Map<string, number>()
  let title = ""

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    const fence = FENCE_RE.exec(line)
    if (fence) {
      const lang = fence[1].toLowerCase() || "text"
      const body: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i])
        i++
      }
      i++ // closing fence (or EOF)
      blocks.push({ type: "code", lang, code: body.join("\n") })
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6
      const text = heading[2].trim()
      i++
      if (level === 1) {
        title = text
        continue
      }
      if (level === 2 || level === 3) {
        const id = slugify(text, usedSlugs)
        blocks.push({ type: "heading", level, text, id })
        toc.push({ id, text, level })
      } else {
        // Deeper headings still render, but stay out of the TOC.
        blocks.push({
          type: "heading",
          level: 3,
          text,
          id: slugify(text, usedSlugs),
        })
      }
      continue
    }

    if (QUOTE_RE.test(line)) {
      const body: string[] = []
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        body.push(lines[i].replace(QUOTE_RE, ""))
        i++
      }
      blocks.push({ type: "quote", text: body.join(" ").trim() })
      continue
    }

    if (
      line.startsWith("|") &&
      i + 1 < lines.length &&
      TABLE_SEP_RE.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const header = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]))
        i++
      }
      blocks.push({ type: "table", header, rows })
      continue
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: "rule" })
      i++
      continue
    }

    const listMatch = LIST_RE.exec(line)
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1])
      const items: { marker: string; text: string }[] = []
      while (i < lines.length) {
        const current = lines[i]
        const match = LIST_RE.exec(current)
        if (match && /^\d/.test(match[1]) === ordered) {
          items.push({
            marker: match[1].replace(/[.)]$/, ""),
            text: match[2].trim(),
          })
          i++
          continue
        }
        if (current.trim() && /^\s+/.test(current) && items.length > 0) {
          items[items.length - 1].text += " " + current.trim()
          i++
          continue
        }
        break
      }
      blocks.push({ type: "list", ordered, items })
      continue
    }

    // Paragraph: consume consecutive plain lines until a blank line or block start.
    const rawLines: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      rawLines.push(lines[i])
      i++
    }

    let text = ""
    for (let j = 0; j < rawLines.length; j++) {
      const content = rawLines[j].trim()
      if (j === 0) {
        text = content
        continue
      }
      // Markdown hard line break: previous line ends with two or more spaces.
      const hardBreak = / {2,}$/.test(rawLines[j - 1])
      text += hardBreak ? `\n${content}` : ` ${content}`
    }

    blocks.push({ type: "paragraph", text })
  }

  const firstHeading = blocks.findIndex((block) => block.type === "heading")

  if (firstHeading === -1) {
    return { title, toc, preamble: blocks, blocks: [] }
  }

  return {
    title,
    toc,
    preamble: blocks.slice(0, firstHeading),
    blocks: blocks.slice(firstHeading),
  }
}

/** Extracts `**Key:** value` style metadata chips from preamble paragraphs. */
export function splitPreamble(preamble: Block[]) {
  const chips: { label: string; value: string }[] = []
  const rest: Block[] = []

  const pushBlock = (block: Block) => {
    if (block.type === "rule") return

    if (block.type === "paragraph") {
      // Hard-broken metadata lines are chip-tested line by line.
      const fragments = block.text.split("\n")

      for (const fragment of fragments) {
        const match = /^\*\*([^*]+):\*\*\s*(.+)$/.exec(fragment)

        if (match && match[2].trim().length <= 72) {
          chips.push({ label: match[1].trim(), value: match[2].trim() })
        } else {
          rest.push({ type: "paragraph", text: fragment })
        }
      }

      return
    }

    rest.push(block)
  }

  for (const block of preamble) {
    pushBlock(block)
  }

  return { chips, rest }
}
