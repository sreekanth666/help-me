# @helpme/markdown-feature-markdown-to-word

React UI for `/markdown-to-word`: paste Markdown, preview it, and copy it as rich text for Word.
The conversion lives in `@helpme/markdown-domain`; `copy-html.ts` writes `text/html` and
`text/plain` to the clipboard, falling back to a selection copy where `ClipboardItem` is missing.
