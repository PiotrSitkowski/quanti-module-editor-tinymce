/**
 * validateSettingsAgainstSchema — Unit Tests
 *
 * TDD coverage for Auto-Default Injection & Strict Coercion:
 *   - Happy path: full payload, partial payload, empty payload → defaults filled
 *   - Sanitize:   "" treated as absent for non-string-default and string fields
 *   - Coerce:     "500" → 500 for height
 *   - Sad paths:  out-of-range numbers, unknown enum values, non-object input
 */

import { describe, it, expect } from 'vitest';
import {
    validateSettingsAgainstSchema,
    parseSettingsOrThrow,
    SettingsValidationError,
} from './module-settings.schema.js';

// ── Defaults expected when nothing is supplied ─────────────────────────────────

const FULL_DEFAULTS = {
    tinyMceApiKey:      '',
    width:              'auto',
    height:             500,
    resize:             'true',
    menubar:            false,
    statusbar:          true,
    toolbarSticky:      false,
    branding:           false,
    skin:               'oxide',
    contentCss:         'default',
    contentStyle:       '',
    plugins:            expect.stringContaining('advlist'),
    toolbar:            expect.stringContaining('bold'),
    toolbarMode:        'floating',
    browserSpellcheck:  true,
    pasteAsText:        false,
    pasteDataImages:    true,
    automaticUploads:   true,
};

// ── Happy paths ────────────────────────────────────────────────────────────────

describe('validateSettingsAgainstSchema — happy paths', () => {

    it('returns all defaults when given an empty object', () => {
        const result = validateSettingsAgainstSchema({});
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data).toMatchObject(FULL_DEFAULTS);
    });

    it('merges partial payload with defaults', () => {
        const result = validateSettingsAgainstSchema({ height: 800, skin: 'oxide-dark' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.height).toBe(800);
        expect(result.data.skin).toBe('oxide-dark');
        expect(result.data.width).toBe('auto');      // default injected
        expect(result.data.menubar).toBe(false);     // default injected
    });

    it('accepts a fully populated valid payload', () => {
        const full = {
            tinyMceApiKey: 'my-key',
            width: 1200,
            height: 600,
            resize: 'both',
            menubar: true,
            statusbar: false,
            toolbarSticky: true,
            branding: true,
            skin: 'oxide-dark',
            contentCss: 'writer',
            contentStyle: 'body { color: red; }',
            plugins: 'lists link',
            toolbar: 'bold italic',
            toolbarMode: 'wrap',
            browserSpellcheck: false,
            pasteAsText: true,
            pasteDataImages: false,
            automaticUploads: false,
        };
        const result = validateSettingsAgainstSchema(full);
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data).toMatchObject(full);
    });

});

// ── Sanitization ───────────────────────────────────────────────────────────────

describe('validateSettingsAgainstSchema — empty-string sanitization', () => {

    it('treats "" height as absent → injects default 500', () => {
        const result = validateSettingsAgainstSchema({ height: '' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.height).toBe(500);
    });

    it('treats 0 height as absent (AutoForm empty number widget) → injects default 500', () => {
        const result = validateSettingsAgainstSchema({ height: 0 });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.height).toBe(500);
    });

    it('treats "" skin as absent → injects default "oxide"', () => {
        const result = validateSettingsAgainstSchema({ skin: '' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.skin).toBe('oxide');
    });

    it('treats "" tinyMceApiKey as absent → injects default ""', () => {
        // For string fields whose default IS "", the result is identical but the
        // mechanism (sanitize → Zod default) must still be exercised.
        const result = validateSettingsAgainstSchema({ tinyMceApiKey: '' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.tinyMceApiKey).toBe('');
    });

    it('treats "" resize as absent → injects default "true"', () => {
        const result = validateSettingsAgainstSchema({ resize: '' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.resize).toBe('true');
    });

    it('treats "" toolbarMode as absent → injects default "floating"', () => {
        const result = validateSettingsAgainstSchema({ toolbarMode: '' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.toolbarMode).toBe('floating');
    });

    it('ignores all "" values in a mixed payload', () => {
        const result = validateSettingsAgainstSchema({
            height: '',
            skin: '',
            resize: '',
            tinyMceApiKey: 'real-key',
        });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.height).toBe(500);
        expect(result.data.skin).toBe('oxide');
        expect(result.data.resize).toBe('true');
        expect(result.data.tinyMceApiKey).toBe('real-key');
    });

});

// ── Numeric coercion ───────────────────────────────────────────────────────────

describe('validateSettingsAgainstSchema — numeric coercion', () => {

    it('coerces "500" string to number 500 for height', () => {
        const result = validateSettingsAgainstSchema({ height: '700' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.height).toBe(700);
    });

    it('coerces width numeric string via z.coerce.number() in configSchema', () => {
        const result = validateSettingsAgainstSchema({ width: '1024' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.width).toBe(1024);
    });

    it('width accepts literal "auto" without coercion', () => {
        const result = validateSettingsAgainstSchema({ width: 'auto' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.width).toBe('auto');
    });

});

// ── Sad paths ──────────────────────────────────────────────────────────────────

describe('validateSettingsAgainstSchema — sad paths', () => {

    it('rejects non-object input (string)', () => {
        const result = validateSettingsAgainstSchema('bad');
        expect(result.success).toBe(false);
    });

    it('rejects non-object input (null)', () => {
        const result = validateSettingsAgainstSchema(null);
        expect(result.success).toBe(false);
    });

    it('rejects non-object input (array)', () => {
        const result = validateSettingsAgainstSchema([]);
        expect(result.success).toBe(false);
    });

    it('rejects height between 1–199 (too small, not the "absent" sentinel 0)', () => {
        const result = validateSettingsAgainstSchema({ height: 100 });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors[0].path).toBe('height');
    });

    it('rejects height above maximum (2000)', () => {
        const result = validateSettingsAgainstSchema({ height: 9999 });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors[0].path).toBe('height');
    });

    it('rejects invalid skin enum value', () => {
        const result = validateSettingsAgainstSchema({ skin: 'neon' });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors[0].path).toBe('skin');
    });

    it('rejects invalid toolbarMode enum value', () => {
        const result = validateSettingsAgainstSchema({ toolbarMode: 'rainbow' });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors[0].path).toBe('toolbarMode');
    });

    it('rejects width below minimum when numeric', () => {
        const result = validateSettingsAgainstSchema({ width: 50 });
        expect(result.success).toBe(false);
    });

    it('includes path and message in error objects', () => {
        const result = validateSettingsAgainstSchema({ height: 10 });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors[0]).toHaveProperty('path');
        expect(result.errors[0]).toHaveProperty('message');
        expect(typeof result.errors[0].path).toBe('string');
        expect(typeof result.errors[0].message).toBe('string');
    });

});

// ── parseSettingsOrThrow ───────────────────────────────────────────────────────

describe('parseSettingsOrThrow', () => {

    it('returns parsed data on valid input', () => {
        const data = parseSettingsOrThrow({ height: 600 });
        expect(data.height).toBe(600);
        expect(data.skin).toBe('oxide');
    });

    it('throws SettingsValidationError with statusCode 422 on invalid input', () => {
        expect(() => parseSettingsOrThrow({ height: 1 })).toThrow(SettingsValidationError);
        try {
            parseSettingsOrThrow({ height: 1 });
        } catch (err) {
            expect(err).toBeInstanceOf(SettingsValidationError);
            expect((err as SettingsValidationError).statusCode).toBe(422);
            expect((err as SettingsValidationError).errors.length).toBeGreaterThan(0);
        }
    });

    it('throws SettingsValidationError for non-object input', () => {
        expect(() => parseSettingsOrThrow(null)).toThrow(SettingsValidationError);
    });

});
