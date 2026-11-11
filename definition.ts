/**
 * EditorWysywigMceModule Module Manifest
 *
 * SSoT for the Quanti Orchestrator. The runtime reads ONLY this file -
 * it never analyses TypeScript source code.
 *
 * RULES:
 *  - description MUST be >50 words (RAG/Vectorize discovery)
 *  - Bump schemaVersion whenever schema.ts changes (triggers auto-DDL at next tenant activation)
 *  - behaviorRules use JSON Logic - no hardcoded if/else in service.ts
 *  - configSchema fields must match configUi keys (enforced by `quanti validate`)
 */

import { z } from 'zod';

export const editor_wysywig_mceDefinition = {
    id:            'editor-wysywig-mce',
    name:          'Editor Wysywig Mce',
    // The words a person reads in the panel, in both languages; `name` stays the registry's own.
    identity: {
        name:        { en: { value: 'Rich-text editor', provenance: 'creator' }, pl: { value: 'Edytor tekstu', provenance: 'creator' } },
        description: { en: { value: 'Reusable rich-text editor (TinyMCE) that other modules embed to write formatted content; it stores nothing of its own.', provenance: 'creator' }, pl: { value: 'Edytor tekstu sformatowanego (TinyMCE) do osadzenia przez inne moduły, żeby pisać treść z formatowaniem; sam niczego nie przechowuje.', provenance: 'creator' } },
    },
    serviceType:   'content',
    schemaVersion: 1,
    version:       '1.1.3',
    icon:          'Box',

    description: `Reusable WYSIWYG editor slot module powered by TinyMCE hosted on Quanti CDN (R2). This module provides
        an embeddable rich text editor component for the Quanti platform. It does not manage its own
        database - it acts as a pure UI slot that other modules (posts, pages, emails) embed to enable
        formatted HTML authoring. The editor receives initial content via props.context.data and emits
        HTML changes back to the host module via context.actions callbacks. TinyMCE is loaded from
        the internal Quanti CDN bucket (cdn.quanti-system.cloud) via src/lib/tinyMceLoader.ts, ensuring
        zero external network dependencies and full CSP compliance.`,

    slots:         ['editor_wysywig_mce_main_view', 'editor_wysywig_mce_detail_panel'],
    permissions:   [],
    behaviorRules: [],

    mcpTools: {
        create_editor_wysywig_mce: {
            name:        'create_editor_wysywig_mce',
            description: 'Creates a new editor-wysywig-mce session record. Use this tool when a host module needs to persist editor state or track content revision history for an editing session.',
            tags:        ['Editor Wysywig Mce'],
            annotations: {
                title:           'Create Editor Wysywig Mce',
                readOnlyHint:    false,
                destructiveHint: false,
                idempotentHint:  false,
                openWorldHint:   false,
            },
            requiredContext: ['projectId', 'instanceKey'],
            emitsEvents: ['editor_wysywig_mce.created'],
        },
        list_editor_wysywig_mce: {
            name:        'list_editor_wysywig_mce',
            description: 'Lists all editor-wysywig-mce session records for a project. Use when displaying a history of editing sessions or browsing saved drafts associated with this editor instance.',
            tags:        ['Editor Wysywig Mce'],
            annotations: {
                title:           'List Editor Wysywig Mce',
                readOnlyHint:    true,
                destructiveHint: false,
                idempotentHint:  true,
                openWorldHint:   false,
            },
            requiredContext: ['projectId', 'instanceKey'],
            emitsEvents: [],
        },
        update_editor_wysywig_mce: {
            name:        'update_editor_wysywig_mce',
            description: 'Updates an existing editor-wysywig-mce session record. Use this tool when autosaving HTML content changes during an active editing session or updating session metadata.',
            tags:        ['Editor Wysywig Mce'],
            annotations: {
                title:           'Update Editor Wysywig Mce',
                readOnlyHint:    false,
                destructiveHint: false,
                idempotentHint:  true,
                openWorldHint:   false,
            },
            requiredContext: ['projectId', 'instanceKey'],
            emitsEvents: ['editor_wysywig_mce.updated'],
        },
        delete_editor_wysywig_mce: {
            name:        'delete_editor_wysywig_mce',
            description: 'Permanently deletes an editor-wysywig-mce session record. Use only when explicitly removing a saved draft or editing session at the explicit request of the user.',
            tags:        ['Editor Wysywig Mce'],
            annotations: {
                title:           'Delete Editor Wysywig Mce',
                readOnlyHint:    false,
                destructiveHint: true,
                idempotentHint:  true,
                openWorldHint:   false,
            },
            requiredContext: ['projectId', 'instanceKey'],
            emitsEvents: ['editor_wysywig_mce.deleted'],
        },
    },

    dataSemantics: {
        createdAt: {
            semanticType: 'temporal',
            impact:       'neutral',
            unit:         'timestamp',
            description:  'Creation date of the record.',
        },
    },

    columnSemantics: {
        // Mandatory columns only - this module is a pure UI slot (no domain-specific DB columns)
        createdAt: {
            semanticType: 'temporal',
            unit:         'timestamp',
            aggregatable: false,
            aiHint:       'Unix timestamp of record creation. Immutable after insert. Used for audit trail only.',
        },
    },

    processGraph: {
        participatesIn: [
            {
                processId:   'content-editing',
                role:        'creator',
                description: 'Provides an embeddable TinyMCE WYSIWYG editor slot consumed by content modules such as posts, pages, and emails to enable rich HTML authoring.',
                step:        1,
                totalSteps:  1,
            },
        ],

        automations: [],

        relations: [],
    },

    uiExtensions: [
        {
            slot:      'editor_wysywig_mce_main_view',
            component: 'EditorWysywigMceTable',
            priority:  10,
            description: 'Główny slot edytora WYSIWYG oparty na TinyMCE. Renderuje edytor z pełną konfiguracją z context.config (skórka, toolbar, pluginy, wymiary, zachowanie wklejania). Odbiera treść HTML z context.data.initialContent i emituje zmiany przez context.actions.onChange i onSave.',
        },
        {
            slot:      'editor_wysywig_mce_detail_panel',
            component: 'EditorWysywigMceDetailPanel',
            priority:  10,
            description: 'Panel podgladu tresci HTML wyprodukowanej przez edytor. Wyswietla bezpieczny rendering HTML z context.data.content w trybie tylko do odczytu, umozliwiajac modulom-hostom podglad zapisanej tresci bez aktywnego edytora TinyMCE.',
        },
        {
            slot:      'post_editor',
            component: 'PostEditorSlot',
            priority:  10,
            description: 'Producent slotu post_editor hostowanego przez modul posts — zastepuje fallback <textarea> pelnoprawnym edytorem TinyMCE. Czyta seed z context.value, reconciliuje przy zmianie postId (nawigacja miedzy postami), woła context.onChange(text) na kazda edycje aby host wykryl dirty-state. Nie emituje posts:editor:* eventow ani nie wola context.rpc — zapis i akcje bottom_bar nalezace do PostsEditorActions. a11y: root edytora oznaczony id="posts-editor-content" dla powiazania z hostowym <Label>.',
        },
    ],
} as const;

export type EditorWysywigMceModuleDefinition = typeof editor_wysywig_mceDefinition;

// ── Enumeracje ────────────────────────────────────────────────────────────────
// z.union([z.enum([...valid...]), z.literal('')]) zamiast z.enum([..., ''])
// → manifest: anyOf [{enum: [valid]}, {const: ""}]
// → Kernel akceptuje "" przez gałąź {const: ""}
// → AutoForm generuje opcje SELECT tylko z anyOf[0].enum — bez "" — brak Select.Item crash
const SkinEnum        = z.union([z.enum(['oxide', 'oxide-dark']),   z.literal('')]).default('oxide');
const ContentCssEnum  = z.union([z.enum(['default', 'dark', 'document', 'writer']), z.literal('')]).default('default');
const ResizeEnum      = z.union([z.enum(['false', 'true', 'both']), z.literal('')]).default('true');
const ToolbarModeEnum = z.union([z.enum(['floating', 'sliding', 'scrolling', 'wrap']), z.literal('')]).default('floating');

// Module Configuration Schema
// Defines the structure of settings editable by the tenant admin.
// Platform Admin UI auto-generates a form from this schema.
// configSchema keys MUST match configUi keys — enforced by `quanti validate`.
export const configSchema = z.object({
    // No API key: the editor loads from the Quanti CDN under GPL (`license_key: 'gpl'`) and nothing ever read the
    // saved key — a field that promised an effect it never had (kernel prompt 131, the "every setting has a reader" rule).

    // UI & Layout
    // z.coerce.number() — AutoForm wysyła string z widgetu 'text' (np. "800");
    // coerce konwertuje go do liczby przed walidacją min/max, zapobiegając 422.
    // AutoForm wysyła "" dla pustego pola tekstowego — dodajemy z.literal('') do unii,
    // żeby Kernel nie odrzucił payloadu; realna walidacja (min 200) jest w validateSettingsAgainstSchema.
    width: z.union([z.coerce.number().min(0).max(3000), z.literal('auto'), z.literal('')]).default('auto').describe(
        'Szerokość edytora w pikselach lub "auto" dla 100% kontenera.'
    ),
    // AutoForm wysyła 0 dla pustego widgetu number — min(0) pozwala Kernelowi przepuścić payload;
    // realna walidacja (min 200) jest w validateSettingsAgainstSchema.
    height: z.number().min(0).max(2000).default(500).describe(
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

// Configuration UI Hints
// Keys MUST match configSchema keys (17 fields) — enforced by `quanti validate`.
// Every text the settings page draws (name, description, group title, option names) is `{ en, pl }` — the page shows
// one plain string to every reader and notes that a translation is missing (`quanti validate`: settings-one-language).
// Module UI strings (component layer) are localized separately via src/locales/*.ts.
type Text = { en: string; pl: string };
const GROUP_LAYOUT: Text = { en: 'Layout', pl: 'Układ' };
const GROUP_APPEARANCE: Text = { en: 'Appearance', pl: 'Wygląd' };
const GROUP_FUNCTIONALITY: Text = { en: 'Functionality', pl: 'Funkcje' };
const GROUP_BEHAVIOR: Text = { en: 'Behavior', pl: 'Zachowanie' };

export const configUi: Record<string, {
    label: Text;
    widget: string;
    description?: Text;
    options?: Array<{ value: string; label: Text }>;
    group?: Text;
    min?: number;
    max?: number;
}> = {
    // ── UI & Layout ──────────────────────────────────────────────────────────
    width: {
        label:       { en: 'Editor width', pl: 'Szerokość edytora' },
        widget:      'text',
        description: {
            en: 'Number (px) or "auto" for full container width.',
            pl: 'Liczba (w px) albo „auto” — wtedy edytor zajmuje całą szerokość kontenera.',
        },
        group:       GROUP_LAYOUT,
    },
    height: {
        label:       { en: 'Editor height (px)', pl: 'Wysokość edytora (px)' },
        widget:      'number',
        description: {
            en: 'Height of the editing area in pixels, from 200 to 2000.',
            pl: 'Wysokość obszaru edycji w pikselach, od 200 do 2000.',
        },
        min:         200,
        max:         2000,
        group:       GROUP_LAYOUT,
    },
    resize: {
        label:       { en: 'Resize handle', pl: 'Uchwyt zmiany rozmiaru' },
        widget:      'select',
        description: {
            en: 'Whether a person can drag the editor’s corner to change its size, and along which axes.',
            pl: 'Czy osoba może przeciągnąć róg edytora, żeby zmienić jego rozmiar, i w których osiach.',
        },
        options: [
            { value: 'false', label: { en: 'Disabled', pl: 'Wyłączony' } },
            { value: 'true',  label: { en: 'Vertical', pl: 'Tylko w pionie' } },
            { value: 'both',  label: { en: 'Vertical & horizontal', pl: 'W pionie i w poziomie' } },
        ],
        group:       GROUP_LAYOUT,
    },
    menubar: {
        label:       { en: 'Menu bar', pl: 'Pasek menu' },
        widget:      'switch',
        description: {
            en: 'Show the menu bar (File / Edit / View / Insert / Format / Tools / Table / Help).',
            pl: 'Pokazuje pasek menu (Plik / Edycja / Widok / Wstaw / Format / Narzędzia / Tabela / Pomoc).',
        },
        group:       GROUP_LAYOUT,
    },
    statusbar: {
        label:       { en: 'Status bar', pl: 'Pasek stanu' },
        widget:      'switch',
        description: {
            en: 'Show the bottom status bar with word counter and resize handle.',
            pl: 'Pokazuje dolny pasek stanu z licznikiem słów i uchwytem zmiany rozmiaru.',
        },
        group:       GROUP_LAYOUT,
    },
    toolbarSticky: {
        label:       { en: 'Sticky toolbar', pl: 'Przyklejony pasek narzędzi' },
        widget:      'switch',
        description: {
            en: 'Toolbar stays visible while scrolling long content.',
            pl: 'Pasek narzędzi zostaje widoczny podczas przewijania długiej treści.',
        },
        group:       GROUP_LAYOUT,
    },

    // ── Branding ─────────────────────────────────────────────────────────────
    branding: {
        label:       { en: 'TinyMCE branding logo', pl: 'Logo TinyMCE' },
        widget:      'switch',
        description: {
            en: 'Show/hide the TinyMCE logo in the status bar (recommended: off for white-label).',
            pl: 'Pokazuje albo ukrywa logo TinyMCE na pasku stanu (zalecane: wyłączone przy własnej marce).',
        },
        group:       GROUP_APPEARANCE,
    },

    // ── Theming & Styling ────────────────────────────────────────────────────
    skin: {
        label:       { en: 'Editor skin', pl: 'Motyw edytora' },
        widget:      'select',
        description: {
            en: 'The look of the editor itself — its toolbar and frame: light or dark.',
            pl: 'Wygląd samego edytora — jego paska narzędzi i ramki: jasny albo ciemny.',
        },
        options: [
            { value: 'oxide',      label: { en: 'Oxide (light)', pl: 'Oxide (jasny)' } },
            { value: 'oxide-dark', label: { en: 'Oxide Dark', pl: 'Oxide (ciemny)' } },
        ],
        group:       GROUP_APPEARANCE,
    },
    contentCss: {
        label:       { en: 'Content area style', pl: 'Styl obszaru edycji' },
        widget:      'select',
        description: {
            en: 'How the text area itself looks: the default, dark, a document of limited width, or a serif writing face.',
            pl: 'Jak wygląda sam obszar z tekstem: domyślnie, ciemno, dokument o ograniczonej szerokości albo pismo szeryfowe.',
        },
        options: [
            { value: 'default',  label: { en: 'Default', pl: 'Domyślny' } },
            { value: 'dark',     label: { en: 'Dark', pl: 'Ciemny' } },
            { value: 'document', label: { en: 'Document (limited width)', pl: 'Dokument (ograniczona szerokość)' } },
            { value: 'writer',   label: { en: 'Writer (serif font)', pl: 'Pisarski (krój szeryfowy)' } },
        ],
        group:       GROUP_APPEARANCE,
    },
    contentStyle: {
        label:       { en: 'Custom CSS (content_style)', pl: 'Własny CSS (content_style)' },
        widget:      'textarea',
        description: {
            en: 'CSS injected into the editor iframe. E.g. body { font-family: Georgia; }',
            pl: 'CSS wstrzykiwany do ramki edytora. Np. body { font-family: Georgia; }',
        },
        group:       GROUP_APPEARANCE,
    },

    // ── Plugins ──────────────────────────────────────────────────────────────
    plugins: {
        label:       { en: 'TinyMCE plugins', pl: 'Wtyczki TinyMCE' },
        widget:      'textarea',
        description: {
            en: 'Space-separated plugin list. Changes require an editor reload.',
            pl: 'Lista wtyczek oddzielonych spacjami. Zmiana wymaga ponownego załadowania edytora.',
        },
        group:       GROUP_FUNCTIONALITY,
    },

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbar: {
        label:       { en: 'Toolbar buttons', pl: 'Przyciski paska narzędzi' },
        widget:      'textarea',
        description: {
            en: 'Button configuration. Separate groups with |. E.g. bold italic | link | code',
            pl: 'Układ przycisków. Grupy oddziela się znakiem |. Np. bold italic | link | code',
        },
        group:       GROUP_FUNCTIONALITY,
    },
    toolbarMode: {
        label:       { en: 'Toolbar overflow mode', pl: 'Pasek narzędzi, gdy brakuje miejsca' },
        widget:      'select',
        description: {
            en: 'What the toolbar does when its buttons do not fit in one row.',
            pl: 'Co robi pasek narzędzi, gdy jego przyciski nie mieszczą się w jednym rzędzie.',
        },
        options: [
            { value: 'floating',  label: { en: 'Floating (dropdown)', pl: 'Rozwijany (lista)' } },
            { value: 'sliding',   label: { en: 'Sliding (expandable)', pl: 'Rozsuwany' } },
            { value: 'scrolling', label: { en: 'Scrolling', pl: 'Przewijany' } },
            { value: 'wrap',      label: { en: 'Wrap (multiline)', pl: 'Zawijany (wiele wierszy)' } },
        ],
        group:       GROUP_FUNCTIONALITY,
    },

    // ── Behavior ─────────────────────────────────────────────────────────────
    browserSpellcheck: {
        label:       { en: 'Browser spell check', pl: 'Sprawdzanie pisowni przez przeglądarkę' },
        widget:      'switch',
        description: {
            en: 'Underline misspelled words using the browser built-in spell checker.',
            pl: 'Podkreśla błędnie napisane słowa wbudowanym sprawdzaniem pisowni przeglądarki.',
        },
        group:       GROUP_BEHAVIOR,
    },
    pasteAsText: {
        label:       { en: 'Paste as plain text', pl: 'Wklejanie jako zwykły tekst' },
        widget:      'switch',
        description: {
            en: 'Strip HTML formatting when pasting from clipboard.',
            pl: 'Usuwa formatowanie HTML przy wklejaniu ze schowka.',
        },
        group:       GROUP_BEHAVIOR,
    },
    pasteDataImages: {
        label:       { en: 'Paste images (base64)', pl: 'Wklejanie obrazów (base64)' },
        widget:      'switch',
        description: {
            en: 'Allow pasting images from clipboard directly into the editor content.',
            pl: 'Pozwala wkleić obraz ze schowka bezpośrednio do treści edytora.',
        },
        group:       GROUP_BEHAVIOR,
    },
    automaticUploads: {
        label:       { en: 'Automatic image upload', pl: 'Automatyczne wgrywanie obrazów' },
        widget:      'switch',
        description: {
            en: 'Automatically upload base64 images after paste (requires images_upload_url).',
            pl: 'Po wklejeniu automatycznie wgrywa obrazy base64 (wymaga images_upload_url).',
        },
        group:       GROUP_BEHAVIOR,
    },
};
