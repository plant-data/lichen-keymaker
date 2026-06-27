# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ITALIC Lichen KeyMaker is a Vue 3 SPA that generates dynamic dichotomous identification keys for lichens in Italy/Europe. The user selects filters (distribution, morphological traits, ecology, or an explicit taxa list); the backend ITALIC API returns the matching record set, and the frontend prunes the **full key tree** down to only the couplets leading to the selected species.

The app is purely a client; all data comes from the ITALIC API at `italic.units.it` (see `.env`). There is no backend in this repo.

## Commands

This project uses **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm dev            # Vite dev server (http://localhost:5173)
pnpm build          # type-check (vue-tsc) + vite build
pnpm build-only     # vite build without type-check
pnpm build-apache   # build + scp .htaccess into dist/ (Apache deploy)
pnpm preview        # serve the production build
pnpm type-check     # vue-tsc --build --force
pnpm lint           # eslint --fix across the repo
pnpm format         # prettier --write src/

pnpm test:unit                  # vitest (watch)
pnpm exec vitest run            # vitest once (CI-style)
pnpm exec vitest run path/to.spec.ts  # single unit test file
pnpm test:e2e                   # playwright (auto-starts vite dev / preview)
pnpm exec playwright test e2e/vue.spec.ts     # single e2e file
pnpm exec playwright test -g "name of test"   # filter by title
```

Node 20+ is required. Setup: copy `.env.example` to `.env`.

## Architecture

### Base path `/key-maker/`
The app is served under the `/key-maker/` sub-path in three places that must stay in sync: `vite.config.ts` (`base`), `src/router/index.ts` (`createWebHistory('/key-maker/')`), and `.htaccess` (`RewriteBase`). `vercel.json` rewrites everything to `/` for SPA routing.

### The key pipeline (the core of the app)
1. **Fetch the full key** — `composables/useKeyApi.ts` `fetchFullKey()` GETs the entire ITALIC key and caches it in **IndexedDB** (`utils/indexedDB.ts`, via the `idb` lib) for 24h. This is a large payload, so the cache matters.
2. **Resolve a record set** — a `keyId` (from the URL) is POSTed to get the list of `recordId`s that belong to that key (`fetchRecords`). The special id `'full'` means the unpruned key.
3. **Build + prune the tree** — `utils/key-builder.ts` `Tree` builds a parent/child node tree from the flat `KeyLead[]` (linked by `leadId`/`parentId`). `prune3(records)` recursively drops branches whose leaves aren't in the record set; `prune4()` keeps the full tree. `adjustIds()` renumbers couplets after pruning.
4. **Render** — `stores/keyStore.ts` holds the built `Tree` (non-reactive `keyTree`) and exposes reactive `stepsList`, `uniqueSpeciesWithImages`, and species counts. The same key is viewed several ways under `views/key/`: stepwise table, taxa gallery, taxa name list, and an interactive (couplet-by-couplet) navigator.

`keyId`/`nodeId` live in the route (`:keyId/nodes/:nodeId/`). Routes carrying `meta.requiresKeyData` trigger the key load; `router.beforeEach` syncs the URL `keyId` into `keyStore` and rehydrates saved filters from `localStorage` (`filterKey` / `passedFilterFormData`).

### State (Pinia)
- **`formStore`** (options API) — the filter form. `formData` is the live selection; `referenceData` is the static field catalog (`data/form-combined.ts`). `getSelectedFilters()` flattens `{value,text}` option objects to raw values before POSTing. `passedFilterFormData` is a frozen snapshot of the filters used to generate the current key (so the "refine" view can show what was applied).
- **`keyStore`** (setup API) — owns the `Tree`, loading/error state, and the derived step/species lists for the whole key and for the currently focused node.
- **`speciesStore`** — the explicit taxa selection for the "filter by species" flow.

### Form data definitions
Filter fields are declared as plain data in `src/data/form-*.ts` and merged in `data/form-combined.ts` into one `FormData[]`. Range fields (`rarity`, `range`) are expanded into `<id>1`/`<id>2` (min/max) pairs by `transformRangeData`. To add or change a filter, edit these data files — the form components under `components/form/` render generically from them. Note several `*Old.vue` form/stepper components are legacy and unused by the current router.

### PrimeVue theming
PrimeVue runs **unstyled** (`main.ts`) with a fully vendored "Aura" pass-through preset in `src/presets/aura/` (one file per component) plus Tailwind. Component styling lives in these preset files, not in scoped component CSS.

### API config
All endpoints and asset paths come from `VITE_*` env vars, surfaced through `config/endpoints.ts` (`endpoints` for APIs, `paths` for image/taxon-page URLs). Never hardcode `italic.units.it`; reference these objects.

## Conventions
- `@/` is the alias for `src/` (vite + tsconfig).
- TypeScript is partial: types are strong in `types/index.ts`, `key-builder.ts`, and `keyStore.ts`, but the Pinia options stores and many form components are loosely typed / JS-ish. Match the surrounding file's rigor.
- Comments and some TODOs are in mixed Italian/English; this is expected.
- `lint` and `format` auto-fix; run them before considering a change done.
