# Development Notes

## Setup

```bash
npm install
npm run dev
```

The app runs as a client-side Vite project with no backend.

## Build and Preview

```bash
npm run build
npm run preview
```

## Adding or Updating a Tool

1. Create or edit the tool module in `src/tools/`.
2. Export it from `src/tools/index.js`.
3. Add the tool id to the category list in `src/main.js`.
4. Update the icon and short description used by the home grid.
5. Add or update the tool stylesheet in `src/styles/tools/`.
6. Import the stylesheet in `src/styles/index.css`.

## Styling Conventions

- Base layout and shared controls live in `src/styles/base.css`.
- Tool-specific styles live in their own file under `src/styles/tools/`.
- Keep selectors scoped to the tool to avoid cross-tool side effects.
- Keep mobile overrides near the end of each tool stylesheet.

## Documentation Files

- `README.md` for project setup and overview
- `docs/overview.md` for architecture
- `docs/tools.md` for the tool list
- `docs/development.md` for workflow notes
