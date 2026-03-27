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
    serviceType:   'content',
    schemaVersion: 1,
    version:       '1.0.0',
    icon:          'Box',

    description: `Reusable WYSIWYG editor slot module powered by TinyMCE hosted on Quanti CDN (R2). This module provides
        an embeddable rich text editor component for the Quanti platform. It does not manage its own
        database - it acts as a pure UI slot that other modules (posts, pages, emails) embed to enable
        formatted HTML authoring. The editor receives initial content via props.context.data and emits
        HTML changes back to the host module via context.actions callbacks. TinyMCE is loaded from
        the internal Quanti CDN bucket (cdn.quanti-system.cloud) via src/lib/tinyMceLoader.ts, ensuring
        zero external network dependencies and full CSP compliance.`,

    slots:         ['editor_wysywig_mce_main_view', 'editor_wysywig_mce_detail_panel', 'dashboard_widget'],
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
            slot:      'dashboard_widget',
            component: 'EditorWysywigMceDashboardWidget',
            priority:  10,
            description: 'Widget dashboardu informujacy o dostepnosci edytora WYSIWYG TinyMCE w platformie. Wyswietla status konfiguracji klucza API oraz skrot do otwarcia edytora dla administratorow i redaktorow tresci platformy Quanti.',
        },
    ],
} as const;

export type EditorWysywigMceModuleDefinition = typeof editor_wysywig_mceDefinition;

// ── Enumeracje ────────────────────────────────────────────────────────────────
const SkinEnum        = z.enum(['oxide', 'oxide-dark']).default('oxide');
const ContentCssEnum  = z.enum(['default', 'dark', 'document', 'writer']).default('default');
const ResizeEnum      = z.enum(['false', 'true', 'both']).default('true');
const ToolbarModeEnum = z.enum(['floating', 'sliding', 'scrolling', 'wrap']).default('floating');

// Module Configuration Schema
// Defines the structure of settings editable by the tenant admin.
// Platform Admin UI auto-generates a form from this schema.
// configSchema keys MUST match configUi keys — enforced by `quanti validate`.
export const configSchema = z.object({
    // Core & Auth
    tinyMceApiKey: z.string().default('').describe(
        'Klucz API TinyMCE. Pozostaw puste dla instalacji GPL z Quanti CDN.'
    ),

    // UI & Layout
    // z.coerce.number() — AutoForm wysyła string z widgetu 'text' (np. "800");
    // coerce konwertuje go do liczby przed walidacją min/max, zapobiegając 422.
    width: z.union([z.coerce.number().min(200).max(3000), z.literal('auto')]).default('auto').describe(
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

// Configuration UI Hints
// Keys MUST match configSchema keys (16 fields) — enforced by `quanti validate`.
// Labels/descriptions are English strings — Kernel manifest schema accepts only string type.
// Platform i18n note: per manifest validator contract, configUi fields are flat strings.
// Module UI strings (component layer) remain fully localized via src/locales/*.ts.
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
        label:       'TinyMCE API Key',
        widget:      'text',
        description: 'Optional commercial key. Leave empty when using Quanti CDN (GPL).',
        group:       'Core',
    },

    // ── UI & Layout ──────────────────────────────────────────────────────────
    width: {
        label:       'Editor width',
        widget:      'text',
        description: 'Number (px) or "auto" for full container width.',
        group:       'Layout',
    },
    height: {
        label:  'Editor height (px)',
        widget: 'number',
        min:    200,
        max:    2000,
        group:  'Layout',
    },
    resize: {
        label:   'Resize handle',
        widget:  'select',
        options: [
            { value: 'false', label: 'Disabled' },
            { value: 'true',  label: 'Vertical' },
            { value: 'both',  label: 'Vertical & horizontal' },
        ],
        group: 'Layout',
    },
    menubar: {
        label:       'Menu bar',
        widget:      'switch',
        description: 'Show the menu bar (File / Edit / View / Insert / Format / Tools / Table / Help).',
        group:       'Layout',
    },
    statusbar: {
        label:       'Status bar',
        widget:      'switch',
        description: 'Show the bottom status bar with word counter and resize handle.',
        group:       'Layout',
    },
    toolbarSticky: {
        label:       'Sticky toolbar',
        widget:      'switch',
        description: 'Toolbar stays visible while scrolling long content.',
        group:       'Layout',
    },

    // ── Branding ─────────────────────────────────────────────────────────────
    branding: {
        label:       'TinyMCE branding logo',
        widget:      'switch',
        description: 'Show/hide the TinyMCE logo in the status bar (recommended: off for white-label).',
        group:       'Appearance',
    },

    // ── Theming & Styling ────────────────────────────────────────────────────
    skin: {
        label:   'Editor skin',
        widget:  'select',
        options: [
            { value: 'oxide',      label: 'Oxide (light)' },
            { value: 'oxide-dark', label: 'Oxide Dark' },
        ],
        group: 'Appearance',
    },
    contentCss: {
        label:   'Content area style',
        widget:  'select',
        options: [
            { value: 'default',  label: 'Default' },
            { value: 'dark',     label: 'Dark' },
            { value: 'document', label: 'Document (limited width)' },
            { value: 'writer',   label: 'Writer (serif font)' },
        ],
        group: 'Appearance',
    },
    contentStyle: {
        label:       'Custom CSS (content_style)',
        widget:      'textarea',
        description: 'CSS injected into the editor iframe. E.g. body { font-family: Georgia; }',
        group:       'Appearance',
    },

    // ── Plugins ──────────────────────────────────────────────────────────────
    plugins: {
        label:       'TinyMCE plugins',
        widget:      'textarea',
        description: 'Space-separated plugin list. Changes require an editor reload.',
        group:       'Functionality',
    },

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbar: {
        label:       'Toolbar buttons',
        widget:      'textarea',
        description: 'Button configuration. Separate groups with |. E.g. bold italic | link | code',
        group:       'Functionality',
    },
    toolbarMode: {
        label:   'Toolbar overflow mode',
        widget:  'select',
        options: [
            { value: 'floating',  label: 'Floating (dropdown)' },
            { value: 'sliding',   label: 'Sliding (expandable)' },
            { value: 'scrolling', label: 'Scrolling' },
            { value: 'wrap',      label: 'Wrap (multiline)' },
        ],
        group: 'Functionality',
    },

    // ── Behavior ─────────────────────────────────────────────────────────────
    browserSpellcheck: {
        label:       'Browser spell check',
        widget:      'switch',
        description: 'Underline misspelled words using the browser built-in spell checker.',
        group:       'Behavior',
    },
    pasteAsText: {
        label:       'Paste as plain text',
        widget:      'switch',
        description: 'Strip HTML formatting when pasting from clipboard.',
        group:       'Behavior',
    },
    pasteDataImages: {
        label:       'Paste images (base64)',
        widget:      'switch',
        description: 'Allow pasting images from clipboard directly into the editor content.',
        group:       'Behavior',
    },
    automaticUploads: {
        label:       'Automatic image upload',
        widget:      'switch',
        description: 'Automatically upload base64 images after paste (requires images_upload_url).',
        group:       'Behavior',
    },
};
