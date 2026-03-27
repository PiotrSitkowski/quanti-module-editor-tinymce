# TinyMCE Ultimate Configuration Plan
# Artifact: tinymce-configuration-plan.md
# Module: editor-wysywig-mce
# Author: Senior Platform Architect
# Date: 2026-03-27
# Protocol: QUANTI FLEET v3.5.1

---

## 1. Analiza parametrów inicjalizacyjnych TinyMCE 7

### 1.1 Wybrane grupy parametrów (TinyMCE 7 Docs)

| Obszar | Parametry TinyMCE | Uzasadnienie ekspozycji w panelu |
|--------|-------------------|----------------------------------|
| **Core & Auth** | `license_key` (gpl/api-key) | Możliwość użycia klucza komercyjnego przez tenant |
| **UI Layout** | `width`, `height`, `resize` | Każdy tenant może mieć inne wymagania wymiarowe |
| **UI Controls** | `menubar`, `statusbar`, `toolbar_sticky` | Granularna kontrola elementów interfejsu |
| **Branding** | `branding`, `promotion` | Ukrycie logo TinyMCE w modułach white-label |
| **Theming** | `skin`, `skin_url` | Zmiana motywu (oxide / oxide-dark / custom) |
| **Styling** | `content_css`, `content_style` | Wstrzykiwanie CSS do iframe edytora |
| **Plugins** | `plugins` | Pełna kontrola funkcjonalności edytora |
| **Toolbar** | `toolbar`, `toolbar_mode` | Granularna konfiguracja paska narzędzi |
| **Behavior** | `browser_spellcheck`, `paste_as_text` | Zachowanie edytora podczas wklejania/pisania |
| **Upload** | `automatic_uploads`, `paste_data_images` | Kontrola automatycznych uploadów obrazów |
| **Language** | `language` | Mapowane automatycznie z `context.lang` — nie w panelu admina |

### 1.2 Parametry zarządzane automatycznie (NIE w panelu admina)

Poniższe parametry są zawsze ustawiane przez kod, nie przez konfigurację tenanta:
- `license_key: 'gpl'` — zawsze GPL dla Quanti CDN
- `base_url` — zawsze z `QUANTI_TINYMCE_CDN_URL`
- `suffix: '.min'`
- `target` — zawsze `ref` React (nie selektor CSS)
- `language` — mapowane z `context.lang` ('pl'|'en')
- `setup` — callback wewnętrzny (onChange/onSave/onCancel)

---

## 2. Projekt `configSchema` (Zod)

```typescript
// definition.ts — configSchema (pełna wersja)
import { z } from 'zod';

// ── Enumeracje ───────────────────────────────────────────────────────────────

const SkinEnum = z.enum(['oxide', 'oxide-dark']).default('oxide');
const ContentCssEnum = z.enum(['default', 'dark', 'document', 'writer']).default('default');
const ResizeEnum = z.enum(['false', 'true', 'both']).default('true');
const ToolbarModeEnum = z.enum(['floating', 'sliding', 'scrolling', 'wrap']).default('floating');

// ── Schema ───────────────────────────────────────────────────────────────────

export const configSchema = z.object({
    // Core & Auth
    tinyMceApiKey: z.string().default('').describe(
        'Klucz API TinyMCE. Pozostaw puste dla instalacji GPL z Quanti CDN.'
    ),

    // UI & Layout
    width: z.union([z.number().min(200).max(3000), z.literal('auto')]).default('auto').describe(
        'Szerokość edytora w pikselach lub "auto" dla 100% kontenera.'
    ),
    height: z.number().min(200).max(2000).default(500).describe(
        'Wysokość edytora w pikselach (200–2000).'
    ),
    resize: ResizeEnum.describe(
        'Czy użytkownik może zmieniać rozmiar edytora: false/true (pionowy)/both (obie osie).'
    ),
    menubar: z.boolean().default(false).describe(
        'Pokaż pasek menu (File, Edit, View, Insert, Format, Tools, Table, Help).'
    ),
    statusbar: z.boolean().default(true).describe(
        'Pokaż pasek statusu na dole edytora ze licznikiem słów i rozmiarem.'
    ),
    toolbarSticky: z.boolean().default(false).describe(
        'Przyklejony pasek narzędzi podczas scrollowania długich treści.'
    ),

    // Branding
    branding: z.boolean().default(false).describe(
        'Pokaż logo TinyMCE w pasku statusu (false = ukryj dla white-label).'
    ),

    // Theming & Styling
    skin: SkinEnum.describe(
        'Motyw wizualny edytora: oxide (jasny) lub oxide-dark (ciemny).'
    ),
    contentCss: ContentCssEnum.describe(
        'Styl CSS obszaru edycji: default, dark, document (szerokość ograniczona), writer.'
    ),
    contentStyle: z.string().default('').describe(
        'Niestandardowy CSS wstrzykiwany do iframe edytora. Nadpisuje contentCss dla zaawansowanych stylizacji.'
    ),

    // Plugins
    plugins: z.string().default(
        'advlist autolink lists link image charmap preview anchor ' +
        'searchreplace visualblocks code fullscreen insertdatetime ' +
        'media table help wordcount'
    ).describe(
        'Lista pluginów TinyMCE oddzielonych spacjami. Dostępne: advlist, autolink, lists, link, image, charmap, preview, anchor, searchreplace, visualblocks, code, fullscreen, insertdatetime, media, table, help, wordcount.'
    ),

    // Toolbar
    toolbar: z.string().default(
        'undo redo | blocks | bold italic underline strikethrough | ' +
        'alignleft aligncenter alignright alignjustify | ' +
        'bullist numlist outdent indent | link image | ' +
        'removeformat | code | fullscreen'
    ).describe(
        'Konfiguracja paska narzędzi. Rozdzielaj grupy znakiem |. Użyj false aby ukryć pasek.'
    ),
    toolbarMode: ToolbarModeEnum.describe(
        'Zachowanie paska narzędzi gdy przyciski nie mieszczą się: floating (dropdown), sliding, scrolling, wrap.'
    ),

    // Behavior
    browserSpellcheck: z.boolean().default(true).describe(
        'Włącz sprawdzanie pisowni przez przeglądarkę w obszarze edycji.'
    ),
    pasteAsText: z.boolean().default(false).describe(
        'Wklejaj treść zawsze jako czysty tekst (usuwa formatowanie HTML ze schowka).'
    ),
    pasteDataImages: z.boolean().default(true).describe(
        'Zezwól na wklejanie obrazów jako base64 data URI bezpośrednio do treści.'
    ),
    automaticUploads: z.boolean().default(true).describe(
        'Automatycznie uploaduj obrazy po wklejeniu lub przeciągnięciu (wymaga pluginu image).'
    ),
});

export type EditorConfig = z.infer<typeof configSchema>;
```

### 2.1 Wartości domyślne — uzasadnienie

| Pole | Default | Dlaczego |
|------|---------|----------|
| `tinyMceApiKey` | `''` | GPL nie wymaga klucza |
| `height` | `500` | Bezpieczna wysokość dla większości layoutów |
| `menubar` | `false` | Czysty UX — pasek menu zbędny dla większości |
| `statusbar` | `true` | Licznik słów przydatny dla redaktorów |
| `branding` | `false` | White-label wymaga ukrycia loga TinyMCE |
| `skin` | `oxide` | Jasny motyw jako bezpieczny default |
| `browserSpellcheck` | `true` | Poprawia UX dla wszystkich redaktorów |
| `pasteAsText` | `false` | Zachowanie formatowania to oczekiwany default |
| `automaticUploads` | `true` | Wygoda > kontrola dla typowych wdrożeń |

---

## 3. Projekt `configUi` (AutoForm Widgets)

```typescript
// definition.ts — configUi (pełna wersja)
export const configUi: Record<string, {
    label: string;
    widget: string;
    description?: string;
    options?: Array<{ value: string; label: string }>;
    group?: string;
    min?: number;
    max?: number;
}> = {
    // ── Core & Auth ──────────────────────────────────────────────────────────
    tinyMceApiKey: {
        label: 'TinyMCE API Key',
        widget: 'text',
        description: 'Opcjonalny klucz komercyjny. Przy korzystaniu z Quanti CDN (GPL) zostaw puste.',
        group: 'Core',
    },

    // ── UI & Layout ──────────────────────────────────────────────────────────
    width: {
        label: 'Szerokość edytora',
        widget: 'text',
        description: 'Liczba (px) lub "auto" dla pełnej szerokości.',
        group: 'Układ',
    },
    height: {
        label: 'Wysokość edytora (px)',
        widget: 'number',
        min: 200,
        max: 2000,
        group: 'Układ',
    },
    resize: {
        label: 'Zmiana rozmiaru',
        widget: 'select',
        options: [
            { value: 'false', label: 'Wyłączona' },
            { value: 'true', label: 'Pionowa' },
            { value: 'both', label: 'Pionowa i pozioma' },
        ],
        group: 'Układ',
    },
    menubar: {
        label: 'Pasek menu',
        widget: 'switch',
        description: 'Wyświetl pasek z menu File/Edit/View/Insert/Format/Tools/Table/Help.',
        group: 'Układ',
    },
    statusbar: {
        label: 'Pasek statusu',
        widget: 'switch',
        description: 'Wyświetl dolny pasek z licznikiem słów i uchwytem rozmiaru.',
        group: 'Układ',
    },
    toolbarSticky: {
        label: 'Przyklejony pasek narzędzi',
        widget: 'switch',
        description: 'Pasek narzędzi pozostaje widoczny podczas scrollowania.',
        group: 'Układ',
    },

    // ── Branding ─────────────────────────────────────────────────────────────
    branding: {
        label: 'Logo TinyMCE (branding)',
        widget: 'switch',
        description: 'Ukryj/pokaż logo TinyMCE w pasku statusu (zalecane: wyłączone).',
        group: 'Wygląd',
    },

    // ── Theming & Styling ────────────────────────────────────────────────────
    skin: {
        label: 'Motyw edytora',
        widget: 'select',
        options: [
            { value: 'oxide', label: 'Oxide (jasny)' },
            { value: 'oxide-dark', label: 'Oxide Dark (ciemny)' },
        ],
        group: 'Wygląd',
    },
    contentCss: {
        label: 'Styl obszaru edycji',
        widget: 'select',
        options: [
            { value: 'default', label: 'Domyślny' },
            { value: 'dark', label: 'Ciemny' },
            { value: 'document', label: 'Dokument (ograniczona szerokość)' },
            { value: 'writer', label: 'Writer (czcionka szeryfowa)' },
        ],
        group: 'Wygląd',
    },
    contentStyle: {
        label: 'Niestandardowy CSS (content_style)',
        widget: 'textarea',
        description: 'CSS wstrzykiwany do iframe edytora. Np. body { font-family: Georgia; }',
        group: 'Wygląd',
    },

    // ── Plugins ──────────────────────────────────────────────────────────────
    plugins: {
        label: 'Pluginy TinyMCE',
        widget: 'textarea',
        description: 'Lista pluginów oddzielonych spacjami. Zmiana wymaga przeładowania edytora.',
        group: 'Funkcjonalność',
    },

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbar: {
        label: 'Pasek narzędzi',
        widget: 'textarea',
        description: 'Konfiguracja przycisków. Grupy rozdzielaj |. Np: bold italic | link | code',
        group: 'Funkcjonalność',
    },
    toolbarMode: {
        label: 'Tryb paska narzędzi',
        widget: 'select',
        options: [
            { value: 'floating', label: 'Floating (dropdown)' },
            { value: 'sliding', label: 'Sliding (rozwijany)' },
            { value: 'scrolling', label: 'Scrolling (przewijany)' },
            { value: 'wrap', label: 'Wrap (zawijany)' },
        ],
        group: 'Funkcjonalność',
    },

    // ── Behavior ─────────────────────────────────────────────────────────────
    browserSpellcheck: {
        label: 'Sprawdzanie pisowni',
        widget: 'switch',
        description: 'Podkreślanie błędów przez wbudowaną przeglądarkową korektę ortografii.',
        group: 'Zachowanie',
    },
    pasteAsText: {
        label: 'Wklejaj jako czysty tekst',
        widget: 'switch',
        description: 'Usuwa formatowanie HTML podczas wklejania ze schowka.',
        group: 'Zachowanie',
    },
    pasteDataImages: {
        label: 'Wklejanie obrazów (base64)',
        widget: 'switch',
        description: 'Zezwól na wklejanie obrazów ze schowka bezpośrednio do treści edytora.',
        group: 'Zachowanie',
    },
    automaticUploads: {
        label: 'Automatyczny upload obrazów',
        widget: 'switch',
        description: 'Automatycznie uploaduje obrazy base64 po wklejeniu (wymaga konfiguracji images_upload_url).',
        group: 'Zachowanie',
    },
};
```

### 3.1 Mapowanie widgetów → typy pól

| Widget | Typ Zod | Przykład pola |
|--------|---------|---------------|
| `text` | `z.string()` | `tinyMceApiKey`, `width` |
| `number` | `z.number()` | `height` |
| `switch` | `z.boolean()` | `menubar`, `branding`, `statusbar` |
| `select` | `z.enum()` | `skin`, `resize`, `toolbarMode`, `contentCss` |
| `textarea` | `z.string()` | `plugins`, `toolbar`, `contentStyle` |
| `slider` | `z.number()` z min/max | (opcjonalnie dla `height`) |

---

## 4. Projekt konsumpcji `context.config` w komponencie React

### 4.1 Schemat danych wejściowych — rozszerzenie `EditorWysywigMceTableProps`

```typescript
// src/components/EditorWysywigMceTable.tsx — interfejs

interface EditorConfigFromContext {
    tinyMceApiKey?: string;
    width?: number | 'auto';
    height?: number;
    resize?: 'false' | 'true' | 'both';
    menubar?: boolean;
    statusbar?: boolean;
    toolbarSticky?: boolean;
    branding?: boolean;
    skin?: 'oxide' | 'oxide-dark';
    contentCss?: 'default' | 'dark' | 'document' | 'writer';
    contentStyle?: string;
    plugins?: string;
    toolbar?: string;
    toolbarMode?: 'floating' | 'sliding' | 'scrolling' | 'wrap';
    browserSpellcheck?: boolean;
    pasteAsText?: boolean;
    pasteDataImages?: boolean;
    automaticUploads?: boolean;
}

interface EditorWysywigMceTableProps {
    context: {
        projectId: number;
        instanceKey?: string;
        lang?: string;
        config?: EditorConfigFromContext;   // ← NOWE: wstrzykiwane przez Kernel
        data?: {
            initialContent?: string;
            tinyMceApiKey?: string;         // legacy — prefer context.config.tinyMceApiKey
            config?: TinyMceConfig;         // legacy — prefer context.config
        };
        actions?: {
            onChange?: (html: string) => void;
            onSave?: (html: string) => void;
            onCancel?: () => void;
        };
        api?: {
            dispatchQuantiEvent?: (event: string, payload: unknown) => void;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
}
```

### 4.2 Destrukturyzacja z wartościami domyślnymi (IRON GUARD Pattern)

```typescript
// src/components/EditorWysywigMceTable.tsx — inner component

function EditorWysywigMceTableInner({ context }: EditorWysywigMceTableProps) {
    // ── IRON GUARD ───────────────────────────────────────────────────────────
    if (!context) return null;

    // ── Bezpieczna destrukturyzacja z defaultami z configSchema ──────────────
    // Priorytet: context.config (nowe) > context.data.config (legacy) > hardcoded defaults
    const cfg = context.config ?? {};
    const legacyCfg = context.data?.config ?? {};

    const height           = cfg.height          ?? legacyCfg.height          ?? 500;
    const width            = cfg.width            ?? legacyCfg.width           ?? 'auto';
    const resize           = cfg.resize           ?? 'true';
    const menubar          = cfg.menubar          ?? legacyCfg.menubar         ?? false;
    const statusbar        = cfg.statusbar        ?? true;
    const toolbarSticky    = cfg.toolbarSticky    ?? false;
    const branding         = cfg.branding         ?? false;
    const skin             = cfg.skin             ?? 'oxide';
    const contentCss       = cfg.contentCss       ?? 'default';
    const contentStyle     = cfg.contentStyle     ?? DEFAULT_CONTENT_STYLE;
    const plugins          = cfg.plugins          ?? legacyCfg.plugins         ?? DEFAULT_PLUGINS;
    const toolbar          = cfg.toolbar          ?? legacyCfg.toolbar         ?? DEFAULT_TOOLBAR;
    const toolbarMode      = cfg.toolbarMode      ?? 'floating';
    const browserSpellcheck = cfg.browserSpellcheck ?? true;
    const pasteAsText      = cfg.pasteAsText      ?? false;
    const pasteDataImages  = cfg.pasteDataImages  ?? true;
    const automaticUploads = cfg.automaticUploads ?? true;

    // ── Mapowanie języka platformy → TinyMCE language ────────────────────────
    // Quanti lang: 'pl' | 'en' | undefined  →  TinyMCE language code
    const langMap: Record<string, string> = { pl: 'pl', en: 'en_US' };
    const tinyLang = langMap[context.lang ?? 'en'] ?? 'en_US';

    // ── Inicjalizacja TinyMCE ─────────────────────────────────────────────────
    window.tinymce.init({
        target: editorRef.current,
        license_key: 'gpl',
        base_url: baseUrl,
        suffix: '.min',
        language: tinyLang,
        // Layout
        width: width === 'auto' ? undefined : width,
        height,
        resize: resize === 'false' ? false : resize === 'both' ? 'both' : true,
        menubar,
        statusbar,
        toolbar_sticky: toolbarSticky,
        // Branding
        branding,
        promotion: false,         // zawsze false — Quanti white-label
        // Theming
        skin,
        content_css: contentCss,
        content_style: contentStyle,
        // Plugins & Toolbar
        plugins,
        toolbar,
        toolbar_mode: toolbarMode,
        // Behavior
        browser_spellcheck: browserSpellcheck,
        paste_as_text: pasteAsText,
        paste_data_images: pasteDataImages,
        automatic_uploads: automaticUploads,
        setup: (editor) => { /* ... setup bez zmian */ },
    });
}
```

### 4.3 Stałe domyślne (wyekstrahowane z komponentu)

```typescript
// src/components/EditorWysywigMceTable.tsx — poza komponentem

const DEFAULT_PLUGINS =
    'advlist autolink lists link image charmap preview anchor ' +
    'searchreplace visualblocks code fullscreen insertdatetime ' +
    'media table help wordcount';

const DEFAULT_TOOLBAR =
    'undo redo | blocks | bold italic underline strikethrough | ' +
    'alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | link image | ' +
    'removeformat | code | fullscreen';

const DEFAULT_CONTENT_STYLE = `
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        line-height: 1.6;
        color: #111827;
        margin: 12px;
    }
`;
```

---

## 5. Zakres testów (Vitest TDD)

### 5.1 Testy do napisania / aktualizacji

| Test | Typ | Opis |
|------|-----|------|
| `renders with full config` | happy | Wszystkie 16 pól `context.config` przekazane — brak błędów |
| `renders with empty config {}` | happy | Puste `config` — defaulty się aplikują |
| `renders without config key` | happy | `context.config` = `undefined` — Iron Guard + defaulty |
| `tinymce.init called with height from config` | happy | `config.height=800` → `tinymce.init({ height: 800 })` |
| `tinymce.init called with skin oxide-dark` | happy | `config.skin='oxide-dark'` → `tinymce.init({ skin: 'oxide-dark' })` |
| `lang pl maps to pl` | happy | `context.lang='pl'` → `tinymce.init({ language: 'pl' })` |
| `lang en maps to en_US` | happy | `context.lang='en'` → `tinymce.init({ language: 'en_US' })` |
| `context=null renders context-loader` | sad | Iron Guard: nie crashuje |
| `context=undefined renders context-loader` | sad | Iron Guard: nie crashuje |
| `config.menubar=true passes to tinymce` | config | `menubar: true` przekazane do init |
| `legacy context.data.config.height still works` | compat | Backward compat z poprzednim API |

### 5.2 Mock factory (rozszerzenie)

```typescript
const buildCtx = (overrides = {}) => ({
    projectId: 42,
    instanceKey: 'default',
    lang: 'en',
    config: {               // ← NOWE pole
        height: 500,
        menubar: false,
        statusbar: true,
        branding: false,
        skin: 'oxide',
        contentCss: 'default',
        contentStyle: '',
        plugins: 'lists link autolink code wordcount',
        toolbar: 'bold italic | link',
        toolbarMode: 'floating',
        browserSpellcheck: true,
        pasteAsText: false,
        pasteDataImages: true,
        automaticUploads: true,
        resize: 'true',
        width: 'auto',
        toolbarSticky: false,
        tinyMceApiKey: '',
    },
    data: { initialContent: '' },
    actions: {
        onChange: vi.fn(),
        onSave: vi.fn(),
        onCancel: vi.fn(),
    },
    api: { dispatchQuantiEvent: vi.fn() },
    ...overrides,
});
```

---

## 6. Zmiany w `definition.ts` — `uiExtensions`

Aktualizacja pola `description` w slot `editor_wysywig_mce_main_view`, aby odzwierciedlało nowe pole `context.config`:

```typescript
{
    slot: 'editor_wysywig_mce_main_view',
    component: 'EditorWysywigMceTable',
    priority: 10,
    description: 'Główny slot edytora WYSIWYG oparty na TinyMCE. Renderuje edytor z pełną konfiguracją z context.config (skórka, toolbar, pluginy, wymiary, zachowanie wklejania). Odbiera treść HTML z context.data.initialContent i emituje zmiany przez context.actions.onChange i onSave.',
}
```

---

## 7. Kolejność implementacji (KROK 2 — TDD)

```
RED   → Napisz nowe testy (buildCtx z context.config, asercje na tinymce.init args)
GREEN → Zaktualizuj definition.ts (configSchema + configUi)
GREEN → Zaktualizuj EditorWysywigMceTable.tsx (interfejs + destrukturyzacja)
GREEN → Sprawdź testy legacy (context.data.config backward compat)
REFACTOR → Wynieś DEFAULT_PLUGINS / DEFAULT_TOOLBAR / DEFAULT_CONTENT_STYLE jako stałe
VALIDATE → quanti validate (configSchema keys == configUi keys)
```

---

## 8. Checklist przed `quanti deploy`

- [ ] `configSchema` i `configUi` mają identyczne klucze (16 pól)
- [ ] Każde pole `configUi` ma `label` i `description`
- [ ] `uiExtensions[].description` ≥ 10 słów we wszystkich wpisach
- [ ] Iron Guard: `if (!context) return null` na początku outer + inner
- [ ] `context.lang` mapowany na `language` TinyMCE
- [ ] `context.config` ma priorytet nad `context.data.config` (backward compat)
- [ ] Stałe DEFAULT_* wyeksportowane (lub przynajmniej poza funkcją komponentu)
- [ ] Testy: ≥ 2 sad paths per happy path
- [ ] Zero `fetch()` wewnątrz komponentów
- [ ] Zero importów z zewnętrznych bibliotek UI (tylko `@quanti/ui-kit`)
