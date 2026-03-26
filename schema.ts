// @quanti-protocol: 3.5.1
// @quanti-module: editor-wysywig-mce
// @quanti-domain: generic
// @quanti-constraints: no-joins, no-env-db, edge-10ms

/**
 * EditorWysywigMceModule Drizzle Schema
 *
 * IMPORTANT: This schema is a DECLARATIVE definition.
 * Tables are NOT created from this file directly.
 * The Quanti system reads this schema and auto-provisions tables
 * when the module is activated for a tenant (Lazy Provisioning).
 *
 * DO NOT create manual migrations — bump schemaVersion in definition.ts instead.
 *
 * MANDATORY columns (v4.0 Fleet Protocol — never remove):
 *   id           → Primary key (UUID)
 *   project_id   → Tenant isolation (Anti-IDOR)
 *   instance_key → Module-clone polymorphism (default: 'default')
 *   metadata     → JSON flexible attributes
 *
 * Add module-specific columns BELOW the mandatory block.
 * Bump schemaVersion in definition.ts after every schema change.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const editor_wysywig_mceTable = sqliteTable(
    'editor_wysywig_mce',
    {
        // ── Mandatory columns (DO NOT remove) ──────────────────────────────────
        id:          text('id').primaryKey(),
        projectId:   integer('project_id').notNull(),
        instanceKey: text('instance_key').notNull().default('default'),
        metadata:    text('metadata', { mode: 'json' }),

        // ── Module-specific columns (AI-suggested stubs — uncomment to enable) ─
        // Primary display name
        // name: text('name').notNull(),
        // Lifecycle state: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
        // status: text('status').notNull().default('DRAFT'),

        // ── Timestamps ──────────────────────────────────────────────────────────
        createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
        updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    },
    (table) => ({
        projectIdx:     index('editor_wysywig_mce_project_idx').on(table.projectId),
        instanceKeyIdx: index('editor_wysywig_mce_instance_key_idx').on(table.projectId, table.instanceKey),
    }),
);

export type InsertEditorWysywigMceModule = typeof editor_wysywig_mceTable.$inferInsert;
export type SelectEditorWysywigMceModule = typeof editor_wysywig_mceTable.$inferSelect;
