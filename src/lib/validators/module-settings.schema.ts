/**
 * validateSettingsAgainstSchema — Auto-Default Injection & Strict Coercion
 *
 * Implements the "Auto-Default Injection" architectural standard:
 *   1. SANITIZE   — empty strings ("") and 0 for numeric fields treated as absent (AutoForm artefacts)
 *   2. COERCE     — numeric strings converted to numbers for `number`-typed fields
 *   3. INJECT     — missing keys receive defaults from configSchema (.default())
 *   4. VALIDATE   — Zod type checks + post-parse business constraints; 422 only when violated
 *
 * Architecture note on the split between manifest and this validator:
 *   - `configSchema` in definition.ts uses relaxed constraints (min: 0, enum includes '')
 *     so the Kernel's JSON Schema validation accepts AutoForm's empty-field artefacts.
 *   - Real business constraints (height 200–2000, width 200–3000, strict enum values)
 *     are enforced HERE, after sanitization and default injection.
 *
 * The single source of truth for defaults is `configSchema` in definition.ts.
 * This file never duplicates default values.
 */

import { configSchema, type EditorConfig } from '../../../definition.js';

// ── Number fields that require coercion (AutoForm 'number' widget sends strings) ──
// `width` already uses z.coerce.number() in configSchema — excluded here.
const NUMERIC_FIELDS = ['height'] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

// ── Numeric fields for which 0 means "not set" (AutoForm sends 0 for empty number widget) ──
// These must be removed so Zod injects the .default() value.
const ZERO_MEANS_ABSENT: ReadonlySet<string> = new Set(NUMERIC_FIELDS);

// ── Public result types ────────────────────────────────────────────────────────

export interface ValidationSuccess {
    success: true;
    data: EditorConfig;
}

export interface ValidationFailure {
    success: false;
    errors: Array<{ path: string; message: string }>;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ── Main validator ─────────────────────────────────────────────────────────────

/**
 * Validates and normalises module settings from the Admin UI (AutoForm).
 *
 * Returns a discriminated union — callers must check `result.success` before
 * accessing `result.data`. For RPC handlers that want to throw on error, use
 * the helper `parseSettingsOrThrow()` below.
 */
export function validateSettingsAgainstSchema(raw: unknown): ValidationResult {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return {
            success: false,
            errors: [{ path: '', message: 'Settings payload must be a plain object' }],
        };
    }

    // ── Step 1: Sanitize ────────────────────────────────────────────────────
    // Remove keys whose value signals "not set":
    //   "" — AutoForm sends empty string for text/select/textarea widgets
    //    0 — AutoForm sends 0 for empty number widgets (not null/undefined!)
    // Removing them lets Zod inject .default() values for the field.
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        const isEmptyString = value === '';
        const isZeroPlaceholder = value === 0 && ZERO_MEANS_ABSENT.has(key);
        if (!isEmptyString && !isZeroPlaceholder) {
            sanitized[key] = value;
        }
    }

    // ── Step 2: Coerce numeric strings ─────────────────────────────────────
    // AutoForm's 'number' widget may submit a string (e.g. "500").
    // Only fields explicitly listed in NUMERIC_FIELDS need this — configSchema
    // fields that already use z.coerce.number() handle it themselves.
    for (const field of NUMERIC_FIELDS) {
        const v = sanitized[field as string];
        if (typeof v === 'string') {
            const coerced = Number(v);
            if (!isNaN(coerced)) {
                sanitized[field as string] = coerced;
            }
            // If NaN, leave as-is — Zod will report a typed error
        }
    }

    // ── Step 3: Default Injection + Type Validation ────────────────────────
    // configSchema uses .default() on every property, so Zod fills in any key
    // not present in `sanitized`. A 422-equivalent error is only produced when
    // a field is required AND has no default (currently no such field exists).
    const result = configSchema.safeParse(sanitized);

    if (!result.success) {
        return {
            success: false,
            errors: result.error.issues.map(issue => ({
                path:    issue.path.join('.') || '(root)',
                message: issue.message,
            })),
        };
    }

    // ── Step 4: Business Constraints ──────────────────────────────────────
    // configSchema uses relaxed constraints (min: 0, enum includes '') so the
    // Kernel accepts AutoForm's empty values. Real limits are enforced here,
    // after defaults have been injected (so user-sent "bad" values still fail).
    const businessErrors: Array<{ path: string; message: string }> = [];
    const data = result.data;

    if (data.height < 200 || data.height > 2000) {
        businessErrors.push({ path: 'height', message: `Height must be between 200 and 2000 (got ${data.height})` });
    }

    const widthNum = typeof data.width === 'number' ? data.width : null;
    if (widthNum !== null && (widthNum < 200 || widthNum > 3000)) {
        businessErrors.push({ path: 'width', message: `Width must be between 200 and 3000 or "auto" (got ${widthNum})` });
    }

    const VALID_RESIZE      = new Set(['false', 'true', 'both']);
    const VALID_SKIN        = new Set(['oxide', 'oxide-dark']);
    const VALID_CONTENT_CSS = new Set(['default', 'dark', 'document', 'writer']);
    const VALID_TOOLBAR_MODE = new Set(['floating', 'sliding', 'scrolling', 'wrap']);

    if (data.resize !== '' && !VALID_RESIZE.has(data.resize)) {
        businessErrors.push({ path: 'resize', message: `Invalid resize value: "${data.resize}"` });
    }
    if (data.skin !== '' && !VALID_SKIN.has(data.skin)) {
        businessErrors.push({ path: 'skin', message: `Invalid skin value: "${data.skin}"` });
    }
    if (data.contentCss !== '' && !VALID_CONTENT_CSS.has(data.contentCss)) {
        businessErrors.push({ path: 'contentCss', message: `Invalid contentCss value: "${data.contentCss}"` });
    }
    if (data.toolbarMode !== '' && !VALID_TOOLBAR_MODE.has(data.toolbarMode)) {
        businessErrors.push({ path: 'toolbarMode', message: `Invalid toolbarMode value: "${data.toolbarMode}"` });
    }

    if (businessErrors.length > 0) {
        return { success: false, errors: businessErrors };
    }

    return { success: true, data };
}

/**
 * Throwing variant for use inside RPC WorkerEntrypoint methods.
 * Throws a typed `SettingsValidationError` (HTTP 422) on failure.
 */
export function parseSettingsOrThrow(raw: unknown): EditorConfig {
    const result = validateSettingsAgainstSchema(raw);
    if (!result.success) {
        throw new SettingsValidationError(result.errors);
    }
    return result.data;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class SettingsValidationError extends Error {
    readonly statusCode = 422;
    readonly errors: Array<{ path: string; message: string }>;

    constructor(errors: Array<{ path: string; message: string }>) {
        super(`Settings validation failed: ${errors.map(e => `[${e.path}] ${e.message}`).join('; ')}`);
        this.name = 'SettingsValidationError';
        this.errors = errors;
    }
}
