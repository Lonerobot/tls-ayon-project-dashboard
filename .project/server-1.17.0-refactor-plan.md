# Refactor plan: Project Dashboard on the AYON 1.17.0 addon system

Branch: `server-1.17.0-addon` (from `main` @ `02a4850`, addon v0.1.27)
Status: **PLAN ONLY - no code has been changed.** For review before any refactor starts.

Sources studied (all read-only):

Updated 2026-11-03 with Ynput's answers to the open questions (see sections 2, 3, 7 and 8).

- `ynput/ayon-addon-full-template` @ `a65415f` (README, AGENTS.md, `manifest.ts`, `vite.config.ts`, `package.py`, `server/__init__.py`, the example pages/menus/columns, store and API wiring)
- `ynput/ayon-frontend` @ `d2d4e6e`:
  - `addon/AGENTS.md`: the `@ynput/ayon-addon` 0.3.0 SDK: rules, slot list and slot contexts
  - `shared/src/components/MarkdownEditor/` (`AGENTS.md`, `MarkdownEditor.tsx`, `types.ts`, `index.ts`)
- This repo: `server/`, `frontend/src/`, `vite.config.ts`, `package.json`, `.project/*`

---

## 1. Goals

1. Move the dashboard from the legacy "keyword-named remote module" integration to the **slots** system (`project.page` contribution via a `manifest.ts`).
2. Use AYON's own store, API cache, user context and shared component library instead of our hand-rolled `fetch` calls, mock mode and federation config.
3. **Inline markdown editing** of content blocks, using AYON's `MarkdownEditor`, saved back into addon settings. Settings remain the source of truth; the dashboard gets a nicer way to edit them.
4. Keep every existing feature working: banner, summary, key personnel, links, reference gallery, settings migration safety net.

Non-goals for the first pass: new slots (header item, studio page, table columns), mentions, inline media. See Phase 4.

---

## 2. What the new system gives us (findings)

| Area | Legacy (today) | New (1.17.0) |
|---|---|---|
| Registration | `frontend_modules = {"dashboard": ["ProjectDashboard"]}`; remote exposes an object `{component, module, name, id}` | `frontend_modules = {"dashboard": ["manifest"]}`; `manifest.ts` calls `defineAddon({ contributes: [projectPage({...})] })`; AYON reads descriptions at startup and lazy-loads `component: () => import(...)` |
| Federation config | Hand-written `federation({...})` with 4 shared deps | `ayonAddon({ name })` from `@ynput/ayon-addon-dev/vite`; shares everything AYON provides, bundles nothing twice |
| Props | `{ projectName }` untyped | `SlotProps<'project.page'>`: `user`, `project`, `projectName`, `slicer`, `projectFolders`, `views`; `useSlot('project.page')` anywhere below |
| Current user / permissions | `fetch('/api/users/me')` + `isAdmin`/`isManager` | `useUser()` / `user` in context (`isAdmin`, `isManager`, `isGuest`...) |
| Data | Own `fetch` + `useState` hooks | AYON's shared RTK Query `api`; `api.injectEndpoints` (names **must be prefixed**, e.g. `projectDashboard...`); one cache with AYON; tag invalidation |
| Dev loop | Vite dev server + `DevWrapper` + `VITE_USE_MOCK_DATA` | `yarn dev` (dev shell with AYON's real providers), `yarn dev:ayon` (inside a real AYON), `ayon-addon preview/open/check` CLI, fixtures in `frontend/dev/fixtures` |
| Errors | Crash takes the page | Each contribution is wrapped in an error boundary |
| Min server | `>=1.15.0` | `>=1.17.0-0` (template value; the `-0` lets 1.17 dev/pre-release servers through) |
| Markdown editor | `react-markdown` read-only; edit via settings textarea | `MarkdownEditor` (Lexical-based, stores **markdown**) importable from `@ynput/ayon-frontend-shared/components` |

`@ynput/ayon-frontend-shared`: everything in the top-level `shared/` folder of `ayon-frontend` is reusable by addons (confirmed by Ynput). The host provides these packages through module federation, so the addon uses AYON's own instances.

### Packages are on npm (verified 2026-11-03)

The template README says the SDK "isn't published yet" and links it from a local checkout; that is out of date. Verified against the npm registry:

| Package | Latest |
|---|---|
| `@ynput/ayon-addon` | 0.3.0 |
| `@ynput/ayon-addon-dev` | 0.2.1 |
| `@ynput/ayon-frontend-shared` | 0.8.0 (its `./components` entry includes the Lexical `MarkdownEditor`) |

So we install normally from npm: no `link-frontend`, no `copy-shared`, no local `ayon-frontend` checkout. Note the template's rule: the addon runs against the shared library version **the AYON server ships**, so we must confirm which shared version the target 1.17.x server ships and not depend on anything newer than that.

### Premium / licence note (Power Pack) - resolved

`ayon-power-pack` is premium and not available on all AYON tiers; the repo is private (404 for us). In the template it only appears as a leftover `.gitmodules` entry and as a **host-side** `PowerpackProvider` that AYON itself renders around addon modules; nothing in the template's source imports it. **Ynput confirmed the slot SDK and `MarkdownEditor` are fully open source and not tier-gated.** We take zero dependency on Power Pack (no submodule, no imports).

---

## 3. The important finding: editor vs. our stored markdown

The editor reads/writes markdown, but with its own "contract" (editor `AGENTS.md`):

- Supported nodes registered in the editor: headings, quotes, lists (incl. check lists written as `* [ ]`), code blocks, inline code, links, mentions, media, YouTube. **There is no table node and no horizontal-rule node.**
- Paragraph model: each editor paragraph is one line; adjacent paragraphs are written with `\` + newline hard breaks; one blank line max.
- `normalizeLegacyMarkdown` runs on every import.

Our impact:

1. **GFM tables** are a documented feature of our content blocks (README, and the shipped "Formatting Guide" default block contains a table). Opening such a block in the editor and saving could **flatten/destroy the table** (data loss).
2. Existing hand-written markdown with soft line breaks / `---` rules will be re-serialised differently on first save (cosmetic diff, possibly visible).
3. Read-only rendering must stay `react-markdown` + `remark-gfm` (the editor does not render read-only content; the docs say so explicitly). Tables keep rendering fine in read mode.

Ynput's answer: tables and horizontal rules are **not supported today, but could be added with "probably not too much effort"**. `ayon-frontend` is open source, so upstream support is a realistic option. A contribution would need, per the editor `AGENTS.md` "Adding new syntax": an export/import transformer (order matters), a node registered in `EDITOR_NODES`, the feed renderer and `TextWidget` updated, `markdownToPlainText`, and round-trip checks in `/dev/editor`. It would only reach us after it ships in a server release, so it can't gate our first release; the guard below is the interim answer either way.

**This must be proven with a spike before any UI work (Phase 0, Spike A), with a decision gate:**

| Spike A result | Decision |
|---|---|
| Round trip lossless for our blocks | Use the editor for every block |
| Only tables/rules lost | Either (a) per-block guard: if a block contains a table/hr, edit it in a plain markdown source textarea (AYON `InputTextarea`) instead of the rich editor, or (b) contribute table and horizontal-rule support upstream to `ayon-frontend` (see below) and wait for it to ship in `shared` |
| Broadly lossy | Fall back to "markdown source" editing inline (textarea + live preview) and revisit when the editor gains tables |

---

## 4. Target architecture

### 4.1 Server (`server/`)

| File | Change |
|---|---|
| `package.py` | version `0.2.0`; `ayon_server_version = ">=1.17.0-0"`; drop the 1.15 comment (1.15 `users` enum resolver is superseded by the 1.17 floor) |
| `server/__init__.py` | `frontend_modules = {"dashboard": ["manifest"]}`; keep `get_frontend_modules` (studio-level hide when disabled), `setup()`, router and both migrations |
| `server/settings/models.py` | No schema change. Optionally update the `content` field `description` to say it can be edited inline on the dashboard |
| `server/api/dashboard.py` | Keep GET data, banner and refs endpoints. **Add** a write endpoint for content-block text (see 4.3). Keep server-side permission checks (managers/admins) |
| `server/settings_migration.py` | Keep unchanged. It copies overrides forward on a new addon version, which is exactly the 0.1.27 -> 0.2.0 case; verify explicitly in testing |

### 4.2 Frontend (`frontend/`)

| Current | Fate |
|---|---|
| `vite.config.ts` (custom federation, proxy, mock guard) | Replace with template-style `ayonAddon({ name: "dashboard" })`. The remote name must equal the key in `frontend_modules`. Output dir moves to the plugin's default |
| `package.json` | Align deps/scripts with the template, but install the SDK from npm instead of the template's `link:` entries: `@ynput/ayon-addon`, `@ynput/ayon-addon-dev` (dev), `@ynput/ayon-frontend-shared`, `@reduxjs/toolkit`, `react-redux`, `@ynput/ayon-react-components` (bump), keep `react-markdown` + `remark-gfm`; add `dev`, `dev:ayon`, `ayon-addon` scripts (no `link-frontend` / `copy-shared`) |
| `src/integration/OverviewPanelRemote.tsx` | **Delete** -> replaced by `src/manifest.ts` |
| NEW `src/manifest.ts` | `defineAddon({ contributes: [ projectPage({ id: "dashboard", title: "Dashboard", component: () => import("./pages/DashboardPage") }) ] })` |
| `src/pages/DashboardPanel.tsx` | Becomes `pages/DashboardPage.tsx`: default export, typed `SlotProps<'project.page'>`, reads `projectName`/`user` from context |
| `src/main.tsx`, `src/dev/DevWrapper.tsx`, `src/dev/mockData.ts`, `VITE_USE_MOCK_DATA` | **Delete**. Convert mock data into `frontend/dev/fixtures/*.json` used by `ayon-addon preview` and the dev shell |
| `src/api/dashboardApi.ts`, `hooks/useDashboardData.ts`, `hooks/useProjectRefs.ts` | Replace with injected RTK Query endpoints in e.g. `src/api/projectDashboard.ts`: `projectDashboardGet`, `projectDashboardUpdateBlock`, banner/refs endpoints; names prefixed; tag types added with `enhanceEndpoints` |
| `fetchCurrentUser`, `CurrentUserInfo`, `canManage` plumbing | **Delete**; use `useUser()` -> `isAdmin \|\| isManager` |
| `src/components/*` (Header, Summary, KeyPersonnel, Links, Refs, ProjectDescription) | Keep; port data access to the new hooks; follow `.project/coding_standards.md` (use `@ynput/ayon-react-components` where an equivalent exists, AYON theme tokens). `KeyPersonnel` user lookups can move to AYON's users API through the shared api |
| `src/models/dashboard.ts`, `addonVersion.ts` | Keep |
| `create_package.py` | Diff against the template's version (it handles the new `dist/modules/<name>` layout and the frontend link step) and adopt what is needed while keeping our version-sync and zip behaviour |

### 4.3 Inline markdown editing (headline feature)

UX:

- Content block title + rendered markdown as today (read mode via `react-markdown` + `remark-gfm`, plus the feed plugins `codeTag`, `inputTag`, `blockquoteTag`, `remarkLiteralDirectives`, `COMMENT_DIRECTIVES` from `@ynput/ayon-frontend-shared/Feed` for consistency with AYON comments; links rendered by us since `aTag` is not exported; pass `urlTransform` so non-http urls are not dropped).
- Managers/admins (from `useUser()`) get an Edit (pencil) button on each block. Everyone else sees no edit affordance.
- Edit mode swaps the block body for `<MarkdownEditor variant="document" toolbar ... />` (remounted with a `key` on enter/leave, as AYON's own `DescriptionSection` does), with Save and Cancel buttons. `onSubmit` (Mod+Enter) = Save; `onEscape` = Cancel (guard with a "discard changes?" prompt if dirty). Read `getMarkdown()` via the ref on save rather than trusting the last `onChange`.
- Saving shows AYON `toast` feedback; on success the dashboard query refetches (tag invalidation) and the block returns to read mode.
- Mentions off at first (`mentions` undefined). Media off at first (no `onUploadMedia`).

Persistence (content still lives in settings):

- Editing a block writes the **project-level** `content_blocks` override.
- Option A: use AYON's native settings API from the frontend. Option B: a small addon endpoint (`PUT /dashboard/{project}/content-blocks/{index}`) that validates, checks permission server-side, then writes the project override. Preference is **B** (server enforces permissions, per-block atomic update, consistent with the existing banner/refs endpoints) **if** there is a supported server-side way to save project overrides. `settings_migration.py` currently writes via raw SQL, which is fine for a migration but is not what we want for a user-facing write path (it would bypass settings events/versioning). **Spike B decides this.**
- Optimistic concurrency: the update sends the block's previous content (or a hash); the server rejects with 409 if it has changed, so two managers can't silently overwrite each other (blocks are a positional list).
- Validation: max length (e.g. 100 KB), title/content types, index bounds.

Behaviour to document: because `content_blocks` is a list, the first inline edit on a project that was inheriting studio defaults creates a project override of the **whole list**, so later studio-default changes to blocks no longer propagate to that project. This is standard AYON list-override behaviour; we should tell users.

---

## 5. Phased plan

Each phase ends in a testable state; nothing is released until Phase 5.

### Phase 0 - Environment and spikes (no repo changes except notes)

- 0.1 Get a dev AYON server **>= 1.17.0** (local docker or a Ynput-provided instance). Confirm when `the-line.ayon.app` moves to 1.17.0 (hard prerequisite for deploying).
- 0.2 Install the SDK from npm (`@ynput/ayon-addon@0.3.0`, `@ynput/ayon-addon-dev@0.2.1`, `@ynput/ayon-frontend-shared@0.8.0`) in a scratch copy of the template; confirm the 1.17.x server we test on ships a compatible `shared` version. For Spike A, also clone `ynput/ayon-frontend` (`d2d4e6e`) only if we need its `/dev/editor` playground and cannot reach it on the dev server.
- 0.3 **Spike A - editor round trip** (decision gate in section 3): run our real content blocks (the Formatting Guide + 3 real project blocks) through the editor playground at `/dev/editor` (dev, or user level 700+) and diff the markdown out vs in.
- 0.4 **Spike B - write path**: find the supported way to save project settings overrides server-side (check `ayon-backend`) vs the native settings API from the frontend; confirm permissions model (who may write project settings) and the override semantics for list fields.
- 0.5 **Spike C - embed `MarkdownEditor`** in a throwaway page of the template: confirm it works with the host's shared packages, whether `@module-federation/enhanced` must be installed, and the bundle-size impact (current largest chunk `DashboardPanel` ~176 kB).
- Exit: written results for A, B, C and a go/no-go.

### Phase 1 - Scaffold (behaviour unchanged)

- Bump `package.py` (0.2.0, `>=1.17.0-0`); `frontend_modules`; new `vite.config.ts`, `package.json`, `tsconfig*`, `manifest.ts`; wrap the existing `DashboardPanel` as the `project.page` component using the existing data hooks for now; adopt template `create_package.py` pieces.
- Verify: `yarn ayon-addon check --json`, build, install on the 1.17 dev server, Dashboard tab appears and renders exactly as 0.1.27.

### Phase 2 - Data layer and permissions

- Injected RTK endpoints (prefixed), tag types, remove `fetch`/`useState` hooks; `useUser()` for `canManage`; remove mock mode / DevWrapper / `main.tsx`; add `dev/fixtures`; port Refs and Banner to the new endpoints.
- Verify: `yarn dev` (dev shell), `yarn ayon-addon open project.page dashboard --project <p> --screenshot`, banner upload/remove and refs upload/remove as manager and as artist, studio-disabled behaviour (tab hidden), project-disabled (empty panel).

### Phase 3 - Inline markdown editing

- Server write endpoint (or native API per Spike B), concurrency check, validation, permission check.
- Edit/Save/Cancel UI per 4.3, read renderer with feed plugins, table guard per Spike A.
- Verify: edit as manager (rich text, headings, lists, code, links); artist cannot edit (UI and direct API call is rejected 403); concurrent edit -> 409 handled in UI; settings UI shows the saved text; table block follows the Spike A decision; undo/Escape/dirty-guard behave; keyboard shortcuts (Mod+Enter) do not leak to AYON's own shortcuts.

### Phase 4 - Optional polish (separate PRs, only if wanted)

- Mentions in notes (`@user`, via `createFeedMentionSource`); inline images via `onUploadMedia` into AYON project files; inline editing of title/subtitle/summary/personnel/links; studio-level `studio.page` overview across projects; richer `project.page` options (`access`, views). The slot docs also list header items, tables columns, etc., none needed today.

### Phase 5 - Docs, packaging, release

- README: requirement `AYON >= 1.17.0`, inline editing section, updated dev instructions (`yarn dev`; SDK comes from npm), refreshed screenshots; keep the "Known issues" (tab per-project visibility and order are Ynput limitations for now).
- Version `0.2.0`; build with `create_package.py`; test on a dev bundle including upgrade from 0.1.27 (settings carried forward by the migration safety net, existing banner/refs still served); release notes.

---

## 6. Release and branching strategy

- A package built from this branch **cannot** install on servers < 1.17.0. `main` stays on the legacy integration at 0.1.x (the template does the same: it keeps `main` for the old way) so THE LINE and others on older servers can keep receiving fixes.
- This branch ships as `0.2.x` only once the target server is on 1.17.0. Server-side Python (settings, router, migration) is shared between both lines, so server fixes must be cherry-picked across.
- Don't merge to `main` until a production 1.17 server is the baseline.

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Editor has no table/hr support; saving a table block through it could destroy content | Spike A + per-block fallback editor; never auto-save without an explicit Save |
| 2 | SDK is young (`@ynput/ayon-addon` 0.3.0, dev tools 0.2.1): API may still change. (Earlier concern that it was unpublished is resolved: it is on npm.) | Pin exact versions in `package.json`; keep `shared` no newer than the server ships; re-run `ayon-addon check` on each upgrade |
| 3 | `the-line.ayon.app` may not be on 1.17.0 yet | Confirm with Ynput before Phase 5; keep `main` releasable |
| 4 | List-override semantics (inline edit overrides the whole list; studio defaults stop propagating) | Document; consider storing only edited projects, and tell users |
| 5 | Bypassing AYON settings machinery if we write via raw SQL | Spike B; avoid SQL for the user-facing write path |
| 6 | Bundle size growth from the editor | Spike C; confirm it comes from the host's shared copy |
| 7 | ~~Premium tiers / Power Pack dependency~~ | Resolved: SDK and `MarkdownEditor` are open source and not tier-gated (Ynput) |
| 8 | Tab shows for projects where the addon is disabled at project level; tab order not controllable (existing Known Issues) | Ynput: not supported now (both **No**), but they think it makes sense and it overlaps with the planned Workspace views feature. Unchanged limitation for 0.2.0; keep the Known Issues in the README; revisit when Workspace views land |

---

## 8. Open questions

For you:

1. OK with `0.2.0` + `>=1.17.0-0` and keeping `main` on 0.1.x for older servers?
2. Is a 1.17.0 dev server available to us now, and when does `the-line.ayon.app` upgrade?
3. Table behaviour: if Spike A shows the editor drops tables, is falling back to a markdown-source editor for those blocks acceptable?
4. Should inline editing be allowed for project managers only, or also for any user with project settings permission (decided with Spike B)?

For Ynput (answers received 2026-11-03):

1. Tables / horizontal rules in the editor: **not supported yet; could be added without much effort.** -> Spike A decides interim behaviour; consider an upstream contribution.
2. Supported way for an addon to write its own project settings: **unknown; needs Martin (another Ynput dev).** -> **Still open; blocks the Phase 3 design (Spike B).** Ask Martin specifically: is there a supported server-side API for an addon to set its own project settings overrides (and does it emit settings events/versioning), or is the native `/api/addons/.../settings` endpoint the intended route from the frontend, and which permission does it check?
3. Per-project tab hiding and tab order: **No and No** for now; may come with Workspace views. -> Accepted limitation.
4. Tier availability: **fully open source.** SDK publish timeline: **already on npm.** -> Resolved.
