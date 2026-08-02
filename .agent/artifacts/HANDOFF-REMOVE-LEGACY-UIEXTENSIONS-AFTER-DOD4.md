---
title: Handoff — usuń legacy uiExtensions[] dashboard_widget (post DoD#4)
created: 2026-05-05
priority: P2
target-module: editor-wysywig-mce
kernel-context: Quanti-System commit 30badf7, prod backend ef139132 (deployed 2026-05-05)
---

# Tło

Kernel SCW commit `30badf7` (deployed prod 2026-05-05) usunął runtime filter
`scope`/`activeIn` z `getExtensionsForSlot`. Filter był load-bearing — moduły
z `uiExtensions[]` na slotach systemowych były domyślnie filtrowane przez
`scope='module'` default tak że pokazywały się TYLKO gdy `activeModuleId === modId`.

Po cleanup: brak filtra → entry `dashboard_widget` z modułu
`editor-wysywig-mce` pokazuje się gdziekolwiek mounted jest
`<ExtensionSlot slot="dashboard_widget">`.

**Decyzja user 2026-05-05:** brak revertu kernela (prod = test data),
moduły adaptują się.

# Aktualny stan modułu editor-wysywig-mce (snapshot 2026-05-05)

`quanti.manifest.json` linia ~392 zawiera `uiExtensions[]` z 4 entries:

1. `editor_wysywig_mce_main_view` → `EditorWysywigMceTable` —
   module-internal slot (mounted tylko na stronie edytora WYSIWYG).
   **ZACHOWAJ.**
2. `editor_wysywig_mce_detail_panel` → `EditorWysywigMceDetailPanel` —
   module-internal slot. **ZACHOWAJ.**
3. `dashboard_widget` → `EditorWysywigMceDashboardWidget` — system slot,
   leakuje na strony mountujące dashboard_widget. **USUŃ.**
4. `post_editor` → `PostEditorSlot` — cross-module extension dla modułu
   posts. Slot `post_editor` jest mounted TYLKO wewnątrz
   `PostsDefaultEditor.tsx` (z modułu posts), więc skopiuje się tylko
   gdy użytkownik jest na edycji postu. Bezpieczne. **ZACHOWAJ.**

Moduł NIE ma jeszcze manifest v2 (`manifest_v2_json IS NULL` w D1) —
migracja do v2 to osobny ticket, nie blokuje tego cleanup'u.

# Zadanie

## 1. Edycja definition.ts

Otwórz `definition.ts` (root modułu). W sekcji `uiExtensions: [...]`
usuń obiekt z `slot: 'dashboard_widget'`. Zachowaj pozostałe 3.

Diff:
```ts
uiExtensions: [
    { slot: 'editor_wysywig_mce_main_view', component: 'EditorWysywigMceTable', priority: 10 },
    { slot: 'editor_wysywig_mce_detail_panel', component: 'EditorWysywigMceDetailPanel', priority: 10 },
-   { slot: 'dashboard_widget', component: 'EditorWysywigMceDashboardWidget', priority: 10 },
    { slot: 'post_editor', component: 'PostEditorSlot', priority: 10 },
]
```

## 2. EditorWysywigMceDashboardWidget — decision

Plik `src/components/EditorWysywigMceDashboardWidget.tsx` przestaje być
montowany. Decyzja:

- **Opcja A (rekomendowana):** zostaw plik bez zmian — martwy kod ale
  nie szkodzi (R2 bundle tree-shake).
- **Opcja B:** usuń plik + export + testy.

Akceptujemy regresję UX: dashboard nie pokazuje statusu klucza API
TinyMCE. Re-enable via SCW v2 widget w osobnym tickecie (równolegle z
pełną v2 migracją modułu).

## 3. Regeneracja manifest

```bash
quanti build
```

Verify: `quanti.manifest.json:uiExtensions[]` ma teraz 3 entries
(`editor_wysywig_mce_main_view`, `editor_wysywig_mce_detail_panel`,
`post_editor`).

## 4. Bump version

`definition.ts` + `package.json` bump (semver patch).

## 5. Deploy + smoke

```bash
quanti deploy
```

Smoke prod:
1. `/admin/dashboard` — brak `EditorWysywigMceDashboardWidget`
   (zaakceptowana regresja).
2. `/admin/editor-wysywig-mce/*` — main view + detail panel renderują
   się normalnie (slot module-internal, nadal działa).
3. `/admin/posts/{id}` — w slocie `post_editor` (wewnątrz
   PostsDefaultEditor) renderuje się TinyMCE editor zamiast fallback
   textarea (cross-module extension działa).

## 6. Verify D1 state (kernel-side)

```bash
npx wrangler d1 execute quanti-system --remote \
  --command "SELECT id, json_array_length(ui_extensions) AS cnt, ui_extensions FROM module_registry WHERE id='editor-wysywig-mce'" \
  --json
```

Expected: `cnt = 3`, slots = `editor_wysywig_mce_main_view`,
`editor_wysywig_mce_detail_panel`, `post_editor`.

# Raport powrotu

Po wykonaniu, raportuj:
- Wybrana opcja (A: leave file, B: delete)
- Nowa wersja modułu (v0.X.Y)
- Hash commit'u
- D1 verify wynik
- Smoke prod result (dashboard pusty, post editor działa)

Master coordination doc: `Quanti-System/.agent/artifacts/scw-dod4-followup/HANDOFF-MODULES-LEGACY-UIEXTENSIONS-CLEANUP.md`
