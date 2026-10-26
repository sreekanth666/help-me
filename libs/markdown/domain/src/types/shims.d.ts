// markdown-it 15 bundles its own type definitions, but its plugins do not
// ship any. These shims describe just the surface this project uses.

declare module 'markdown-it-footnote' {
  import type { MarkdownIt } from 'markdown-it';

  const footnote: (md: MarkdownIt) => void;
  export default footnote;
}

declare module 'markdown-it-task-lists' {
  import type { MarkdownIt } from 'markdown-it';

  interface TaskListOptions {
    /** Render checkboxes as enabled rather than disabled. */
    enabled?: boolean;
    /** Wrap the item text in a <label> element. */
    label?: boolean;
    /** Place the <label> after the checkbox rather than around it. */
    labelAfter?: boolean;
  }

  const taskLists: (md: MarkdownIt, options?: TaskListOptions) => void;
  export default taskLists;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
