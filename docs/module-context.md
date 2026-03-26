# Editor Wysywig Mce Module -- Context

> Updated manually. See `.agent/rules/SELF_DOCUMENTING_STANDARDS.md` for conventions.

## Overview

Reusable WYSIWYG editor slot module powered by **TinyMCE Cloud**.
This module does **not** manage its own database. It acts as a pure UI slot
that other modules (posts, pages, emails, articles) embed to enable formatted HTML authoring.

**Key concepts:**
- The editor receives initial HTML via `props.context.data.initialContent`
- Content changes are emitted back via `props.context.actions.onChange(html: string)`
- Save action is emitted via `props.context.actions.onSave(html: string)`
- TinyMCE jest ładowany z **Quanti CDN (R2)** via `src/lib/tinyMceLoader.ts`
  (URL: `https://cdn.quanti-system.cloud/libs/tinymce/tinymce.min.js`)

## File Map

| Plik | Logika Biznesowa |
|------|-----------------||
| src/worker.ts | WorkerEntrypoint stub -- no active DB logic; contract validation only |
| schema.ts | Drizzle ORM schema stub (mandatory columns only -- no module-specific columns) |
| contract.ts | RPC contract -- Zod schemas for tenant-isolated payload validation |
| definition.ts | Module manifest -- configSchema (tinyMceApiKey, editorHeight, plugins, toolbar) |
| src/hooks/useModuleTranslation.ts | i18n hook -- returns EN/PL translations for editor labels |
| src/locales/en.ts | English translations (source of truth) |
| src/locales/pl.ts | Polish translations (must mirror en.ts keys) |
| src/locales/index.ts | Lazy-loaded locale barrel export |
| src/components/EditorWysywigMceTable.tsx | Main WYSIWYG editor slot: loads TinyMCE from CDN, handles onChange/onSave/onCancel callbacks |
| src/components/EditorWysywigMceDetailPanel.tsx | Read-only HTML preview panel from context.data.content |
| src/components/EditorWysywigMceDashboardWidget.tsx | Dashboard widget: shows TinyMCE config status and API key state |
| src/components/index.ts | Barrel export for all UI components |
| src/index.ts | MFE entry barrel -- exports components for R2 bundle |
| src/workers.ts | CQRS Queue Consumer -- processes async events (stub) |
| src/lib/tinyMceLoader.ts | **lib-Isolation:** ładuje TinyMCE z Quanti CDN R2 (`cdn.quanti-system.cloud`). Eksportuje `loadTinyMceFromQuantiCdn()` |
| .agent/overrides/override-tinymce-cdn.md | **RESOLVED:** opis zasobu wewnętrznego R2 — zewnętrzny `cdn.tiny.cloud` zastąpiony |

## Rules & Constraints

- **No direct database writes from UI components** -- this module is a pure UI primitive
- **TinyMCE API Key** is tenant-configurable via `configSchema.tinyMceApiKey` (Admin UI)
- **HTML sanitization** is the responsibility of the **host module** (posts, pages, etc.)
  before storing content in their DB or before passing it to the detail panel
- Never call `fetch()` inside any component -- all communication via `context.api` or `context.actions`
- TinyMCE ładowany z **Quanti CDN (R2)** via `src/lib/tinyMceLoader.ts` — **zero połączeń z zewnętrznymi sieciami**
- lib-Isolation Rule: żaden komponent UI nie może inline wstrzykiwać `<script>` — wyłącznie przez `loadTinyMceFromQuantiCdn()`

## Context Interface (for host modules)

```tsx
// How the posts module would embed this editor:
<ExtensionSlot
    moduleId="editor-wysywig-mce"
    slot="editor_wysywig_mce_main_view"
    context={{
        projectId: 42,
        instanceKey: 'posts-editor',
        lang: 'pl',
        data: {
            initialContent: post.body,            // HTML string
            tinyMceApiKey: config.tinyMceApiKey,  // from tenant config
            config: {
                height: 600,
                toolbar: 'undo redo | bold italic | link',
                plugins: 'lists link autolink',
                menubar: false,
            },
        },
        actions: {
            onChange: (html) => setDraft(html),
            onSave:   (html) => savePost({ ...post, body: html }),
            onCancel: () => router.back(),
        },
    }}
/>
```

## Orchestration Guide

**Triggered by:**
- Host module renders `editor_wysywig_mce_main_view` slot
- Host module renders `editor_wysywig_mce_detail_panel` slot (preview)
- Dashboard renders `dashboard_widget` slot

**Emits (via context.actions):**
- `context.actions.onChange(html: string)` -- on every keystroke / content change
- `context.actions.onSave(html: string)` -- on Save button click
- `context.actions.onCancel()` -- on Cancel button click

**Composes with:**
- `posts` module -- article body editing
- `pages` module -- static page content editing
- `emails` module -- email template editing

## Data Lineage

Dane przeplatają się przez callbacki -- modul nie trzyma stanu poza komponentem.

| Dane | Zrodlo | Aktualizacja |
|------|--------|--------------|
| initialContent | Host module (z wlasnej bazy DB) | Tylko przy montowaniu komponentu |
| currentHtml | Stan wewnetrzny TinyMCE | Przy kazdej zmianie tresci przez uzytkownika |
| Wynik onSave | Emitowany do modulu-hosta | Przy kliknieciu przycisku Save |

> **Regula:** Ten modul NIGDY nie zapisuje tresci do wlasnej bazy. Zaobserwowane
> HTML jest zawsze przekazywane do modulu-hosta przez callback.
