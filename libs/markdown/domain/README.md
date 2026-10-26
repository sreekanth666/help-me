# @helpme/markdown-domain

Pure TypeScript. `markdownToWordHtml(markdown)` turns GitHub-flavoured Markdown into an
inline-styled HTML fragment that pastes into Microsoft Word with Word's own look (Heading 1-6,
native lists and tables, Consolas code). Word ignores classes and CSS variables, so every style is
inline.

Raw HTML in the input is escaped, and only `http`, `https`, `mailto` and `tel` links and
`http`/`https`/`data:image` images are emitted. Run `pnpm nx test markdown-domain` after any change.
