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
            description: 'Glowny slot edytora WYSIWYG oparty na TinyMCE. Renderuje pelnoekranowe okno edytora, laduje TinyMCE z CDN, odbiera tresc HTML z context.data.initialContent i wywoluje context.actions.onChange oraz onSave z nowa trescia HTML.',
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

// Module Configuration Schema
// Defines the structure of settings editable by the tenant admin.
// Platform Admin UI auto-generates a form from this schema.
export const configSchema = z.object({
    tinyMceApiKey:    z.string().default('7ozvvd4u65sd961sn25w20ttvj1kzkbgyatllnn5xbhoeose'),
    editorHeight:     z.number().min(200).max(2000).default(500),
    enableImageTools: z.boolean().default(false),
    toolbar:          z.string().default('undo redo | blocks | bold italic underline | bullist numlist | link | removeformat'),
    plugins:          z.string().default('lists link autolink'),
    menubar:          z.boolean().default(false),
});

// Configuration UI Hints
export const configUi: Record<string, { label: string; widget: string; showIf?: unknown }> = {
    tinyMceApiKey:    { label: 'TinyMCE API Key (legacy — not used with Quanti CDN)', widget: 'text' },
    editorHeight:     { label: 'Editor Height (px)', widget: 'slider' },
    enableImageTools: { label: 'Enable Image Tools Plugin', widget: 'toggle' },
    toolbar:          { label: 'Toolbar Buttons', widget: 'text' },
    plugins:          { label: 'TinyMCE Plugins', widget: 'text' },
    menubar:          { label: 'Show Menu Bar', widget: 'toggle' },
};
