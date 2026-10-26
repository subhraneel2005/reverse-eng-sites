"use client"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"

export function CodeSnippet({
  code,
  language = "text",
  title,
}: {
  code: string
  language?: string
  title?: string
}) {
  const lines = useHighlightedCode(code, language)

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{title ?? language}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}
