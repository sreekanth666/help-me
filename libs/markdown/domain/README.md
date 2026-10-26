# @helpme/markdown-domain

`markdownToWordHtml(markdown)` turns Markdown into an inline-styled HTML fragment that pastes into
Microsoft Word and Google Docs. The pipeline is ported from the standalone `md-to-word` tool and
lives in `src/lib/convert/`:

1. `parse` - markdown-it (footnotes, task lists, linkify); raw HTML is escaped, never passed through.
2. `normalize` - repairs what does not survive a paste (checkboxes become ☑/☐, dead footnote links).
3. `highlight` - highlight.js spans for fenced code that declares a language.
4. `inlineStyles` - applies `style-map.ts` as inline styles and strips classes, which Word ignores.

All typography (Arial, sizes, colours) lives in `style-map.ts` as data. Change a value there, then
read the snapshot diff before accepting it (`pnpm nx test markdown-domain -u`).

The stages use `DOMParser`, so they run in the browser or under jsdom (the tests do).
