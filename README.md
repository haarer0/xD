# xD — Multidimensional Requirements Matrix

**xD** is a browser app for modelling exception-heavy process logic as a decision table: **Inputs (P)**, **Modifiers (M)**, and **Outputs (R)**, with nested conditions, don’t-care cells, merge simplification, and overlap-based conflict detection.

Built for business analysts and product owners who need an agreed case matrix—and a clear hand-off toward implementation—not a general-purpose rules engine.

## Features

- **P / M / R sections** — Inputs, Modifiers, and Outputs with per-section colours (customisable tints)
- **Ternary cells** — `y` (assert), `n` (deny), `x` (don’t care), with shape-first icons for colour-blind use
- **Nested parameters** — array dimensions with schema labels, tooltips, and expand-arrays column view
- **Categories & sub-rows** — numbered cases (`1`, `1.1`, …), insert between rows, drag-and-drop reorder
- **Simplify / merge** — collapse same-category rows that share outputs; don’t-care generalisation on P/M
- **Conflict detection** — overlapping P+M coverage with different R (including don’t-care-as-any)
- **Multi-project library** — switch, add, rename, delete projects in `localStorage` (with name confirmation on delete)
- **Export / import** — CSV, Excel, and JSON (JSON opens in a copy/download dialog)
- **Resolver & logic scheme** — conflict list plus generated implication-style lines
- **Undo / redo** — edit history via keyboard shortcuts

## Condition values

| Symbol | Meaning | Icon cue |
| --- | --- | --- |
| **y** | Assert / yes | Filled circle + tick |
| **n** | Deny / no | Ring + diagonal slash |
| **x** | Don’t care (omit) | Diamond + tilde |

Click a cell to cycle values (don’t care can be disabled per param in the schema).

## Quick start

Requires **Node.js** 18+ (or current LTS).

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test          # Vitest (watch by default; use npm test -- --run for CI)
npm run build     # typecheck + production bundle → dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

## Usage notes

- Projects autosave to **browser `localStorage`** (library of projects + active selection). Use **Export JSON** to back up or share.
- **Demo** loads a sample nested matrix; **Start over** clears only the current project.
- **Sections & schema** (status bar) manages columns, nested slots, don’t-care allowance, and section tints.
- **Merge** collapses mergeable rows in the same category; status **mergeable** counts distinct rows that can merge, not pairwise combinations.

## Stack

- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) 6
- [Zustand](https://zustand-demo.pmnd.rs/) + [zundo](https://github.com/charkour/zundo) (undo)
- [Vitest](https://vitest.dev/) + Testing Library
- [SheetJS](https://sheetjs.com/) (`xlsx`) for Excel export

## Project layout

```text
src/
  components/     UI (matrix, toolbar, modals, …)
  domain/         merge, schema, flatten, logic scheme, …
  export/         CSV / XLSX
  persist/        localStorage library + JSON import/export
  store/          Zustand project store
docs/
  POTENTIAL_FEATURES.md   product backlog / design notes
```

## Roadmap

Ideas and prioritisation live in [`docs/POTENTIAL_FEATURES.md`](docs/POTENTIAL_FEATURES.md) (plain-language summaries, resolver contract export, glossary, etc.). Not a committed schedule.

## License

Private / unlicensed unless otherwise stated. Add a `LICENSE` file if you open the repo publicly.
