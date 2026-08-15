<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->



## Frontend Rules

* Use **Next.js + TypeScript**.
* Use **Sass (SCSS)** for styling. Do not use Tailwind CSS.
* Every component must have a same-named style file in the same directory.

```text
Component.tsx
Component.scss
```

Example:

```text
Button.tsx
Button.scss
```

* Import styles directly in the component:

```tsx
import "./Button.scss";
```

* Use PascalCase for component filenames.
* Keep component-specific styles out of `globals.scss`.
* Prefer Server Components. Only use `"use client"` when required.
* Avoid inline styles unless necessary.
* Follow the existing project structure and reuse existing components where possible.
