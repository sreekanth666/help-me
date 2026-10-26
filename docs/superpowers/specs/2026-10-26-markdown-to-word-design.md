# Design: Markdown to Word

Date: 2026-10-26
Status: Implemented

## Problem

People write in Markdown (notes, AI chat output, READMEs) but hand over Word documents. Pasting
Markdown into Word leaves the `#`, `**` and pipe-table syntax in place.

## Goals

- Paste Markdown, click one button, paste into Word and get real formatting.
- Match the output of the standalone `md-to-word` tool: Arial text, native headings, lists and tables, highlighted code.
- Runs entirely in the browser; nothing is uploaded.

## Non-goals

- Producing a `.docx` file (copy to clipboard only, for now).
- Themes, font choice, math, Mermaid, front matter.

## Decisions

| Area      | Decision                                                                                   | Rationale                                                                                     |
| --------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Transport | Clipboard `text/html` (with `text/plain` fallback)                                         | Word renders the HTML flavor as formatted content; no file step.                              |
| Parser    | `marked` (GFM) with a custom renderer                                                      | Small, synchronous, supports tables, task lists, strikethrough.                               |
| Styling   | Every style inline                                                                         | Word ignores classes and CSS variables on paste.                                              |
| Safety    | Raw HTML escaped; link/image protocols allow-listed                                        | The output is rendered with `innerHTML` in the preview, so no sanitizer dependency is needed. |
| Copy      | `ClipboardItem` first, selection + `execCommand('copy')` fallback                          | Covers browsers and contexts without the async clipboard API.                                 |
| Structure | `libs/markdown/domain` (pure) + `feature-markdown-to-word` (UI), route `/markdown-to-word` | Same shape as KSEB and the converter.                                                         |

## Not yet verified

- Real paste into Word on Windows and macOS, Word for the web, Google Docs and LibreOffice. The
  HTML is checked structurally (unit and e2e tests), not rendered by Word. `md-to-word`'s own
  `docs/paste-checklist.md` lists the open questions (shaded code blocks, task-list bullets, images).
- Remote images only appear in Word when it can fetch them.
