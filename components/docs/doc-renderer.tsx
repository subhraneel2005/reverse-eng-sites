import { Info, ShieldAlert } from "lucide-react"

import { CodeSnippet } from "@/components/docs/code-snippet"
import { getVisual } from "@/components/docs/overrides"
import { renderInline } from "@/lib/docs/inline"
import { splitPreamble, type Block, type ParsedDoc } from "@/lib/docs/parse"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

function renderBlock(
  block: Block,
  index: number,
  options?: { lead?: boolean }
) {
  switch (block.type) {
    case "heading": {
      if (block.level === 2) {
        return (
          <h2
            key={index}
            id={block.id}
            className="group mt-14 mb-5 flex scroll-mt-24 items-baseline gap-3 border-b pb-3 text-2xl font-semibold tracking-tight"
          >
            <span>{renderInline(block.text)}</span>
            <a
              href={`#${block.id}`}
              aria-label={`Link to ${block.text}`}
              className="text-base font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
            >
              #
            </a>
          </h2>
        )
      }
      return (
        <h3
          key={index}
          id={block.id}
          className="group mt-11 mb-3 scroll-mt-24 text-lg font-semibold tracking-tight"
        >
          <span>{renderInline(block.text)}</span>
          <a
            href={`#${block.id}`}
            aria-label={`Link to ${block.text}`}
            className="ml-2 text-sm font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
          >
            #
          </a>
        </h3>
      )
    }

    case "paragraph":
      return (
        <p
          key={index}
          className={cn(
            "leading-7 text-foreground/85 [&+p]:mt-4",
            options?.lead && "text-lg leading-8 text-muted-foreground"
          )}
        >
          {renderInline(block.text)}
        </p>
      )

    case "list": {
      if (block.ordered) {
        return (
          <ol key={index} className="my-5 space-y-2.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted/40 text-xs font-medium text-muted-foreground tabular-nums">
                  {item.marker}
                </span>
                <span className="min-w-0 leading-7 text-foreground/85">
                  {renderInline(item.text)}
                </span>
              </li>
            ))}
          </ol>
        )
      }

      return (
        <ul key={index} className="my-5 space-y-2.5">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-3">
              <span
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <span className="min-w-0 leading-7 text-foreground/85">
                {renderInline(item.text)}
              </span>
            </li>
          ))}
        </ul>
      )
    }

    case "table":
      return (
        <div key={index} className="my-6 overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {block.header.map((cell, cellIndex) => (
                  <TableHead key={cellIndex}>{renderInline(cell)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="align-top">
                      {renderInline(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )

    case "quote": {
      const match = /^\*\*([^*]+):\*\*\s*(.*)$/.exec(block.text)
      const title = match?.[1] ?? "Note"
      const body = match?.[2] ?? block.text

      return (
        <Alert key={index} className="my-6">
          {match ? <ShieldAlert /> : <Info />}
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{renderInline(body)}</AlertDescription>
        </Alert>
      )
    }

    case "code": {
      const visual = getVisual(block.lang, block.code)

      if (visual) {
        const Visual = visual
        return <Visual key={index} code={block.code} lang={block.lang} />
      }

      return (
        <div key={index} className="my-6">
          <CodeSnippet
            code={block.code}
            language={block.lang}
            title={block.lang === "text" ? "text" : block.lang.toUpperCase()}
          />
        </div>
      )
    }

    case "rule":
      return <Separator key={index} className="my-10" />
  }
}

export function DocRenderer({ doc }: { doc: ParsedDoc }) {
  const { chips, rest } = splitPreamble(doc.preamble)

  return (
    <article className="pb-16">
      <header>
        {chips.length > 0 ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-muted-foreground">
                  {chip.label}
                </span>
                <span className="font-medium">{renderInline(chip.value)}</span>
              </span>
            ))}
          </div>
        ) : null}

        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
          {renderInline(doc.title)}
        </h1>

        <div className="mt-5">
          {rest.map((block, index) =>
            renderBlock(block, index, { lead: true })
          )}
        </div>
      </header>

      <div className="mt-4">
        <Badge
          variant="outline"
          className="mb-1 font-normal text-muted-foreground"
        >
          Full report — every table, list and diagram preserved
        </Badge>
      </div>

      <div>{doc.blocks.map((block, index) => renderBlock(block, index))}</div>
    </article>
  )
}
