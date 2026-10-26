import * as React from "react"

const INLINE_RE =
  /(`+)([^`]+?)\1|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|https?:\/\/[^\s<>()\]]+/g

function trimUrl(url: string) {
  return url.replace(/[.,;:!?'"]+$/, "")
}

function renderUrl(url: string, key: string) {
  const href = trimUrl(url)
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
    >
      {href}
    </a>
  )
}

/** Renders inline markdown (bold, `code`, [links](url), bare URLs) to React nodes. */
export function renderInline(text: string): React.ReactNode {
  if (text.includes("\n")) {
    return text.split("\n").map((segment, index) => (
      <React.Fragment key={index}>
        {index > 0 ? <br /> : null}
        {renderInline(segment)}
      </React.Fragment>
    ))
  }

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  INLINE_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [full, backtick, codeText, boldText, linkText, linkHref] = match

    if (backtick) {
      nodes.push(
        <code
          key={key++}
          className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-words"
        >
          {codeText}
        </code>
      )
    } else if (boldText !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {boldText}
        </strong>
      )
    } else if (linkText !== undefined && linkHref !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          {linkText}
        </a>
      )
    } else if (full.startsWith("http")) {
      nodes.push(renderUrl(full, String(key++)))
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}
