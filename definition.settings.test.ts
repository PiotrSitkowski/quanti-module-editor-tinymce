/**
 * Module settings U1 (principal 2026-11-10) — the settings page draws its name, description, group title and option
 * names from `configUi` alone, and shows ONE text to every reader when the module gave a plain string, with a note that
 * a translation is missing. Measured: 17 settings of this module were English strings in a Polish panel.
 *
 * The class under test is "a text the page draws from the declaration is not a real translation", not any one setting:
 * every text is `{ en, pl }` with both languages filled and different (a copy is no translation), and no two settings
 * share a description.
 */
import { describe, expect, it } from 'vitest';
import { configSchema, configUi } from './definition';

const LANGUAGES = ['en', 'pl'] as const;
type Declared = {
    label?: unknown; description?: unknown; placeholder?: unknown; group?: unknown;
    options?: Array<{ value: string; label?: unknown; hint?: unknown }>;
};
const declared = configUi as unknown as Record<string, Declared>;

const translated = (text: unknown): boolean => {
    if (!text || typeof text !== 'object') return false;
    const map = text as Record<string, unknown>;
    const filled = LANGUAGES.map((language) => map[language]).filter((value): value is string => typeof value === 'string' && value.trim() !== '');
    return filled.length === LANGUAGES.length && new Set(filled).size === LANGUAGES.length;
};

describe('editor-wysywig-mce settings — every text in both languages', () => {
    it('declares exactly the settings of the schema', () => {
        expect(Object.keys(declared).sort()).toEqual(Object.keys(configSchema.shape).sort());
    });

    it('every setting has a name, a description and a group in both languages, and so does each option and hint', () => {
        const untranslated: string[] = [];
        for (const [key, field] of Object.entries(declared)) {
            for (const part of ['label', 'description', 'group'] as const) if (!translated(field[part])) untranslated.push(`${key}.${part}`);
            if (field.placeholder !== undefined && !translated(field.placeholder)) untranslated.push(`${key}.placeholder`);
            field.options?.forEach((option, index) => {
                if (!translated(option.label)) untranslated.push(`${key}.options[${index}].label`);
                if (option.hint !== undefined && !translated(option.hint)) untranslated.push(`${key}.options[${index}].hint`);
            });
        }
        expect(untranslated).toEqual([]);
    });

    it('no two settings share a description', () => {
        for (const language of LANGUAGES) {
            const seen = new Map<string, string>();
            for (const [key, field] of Object.entries(declared)) {
                const text = (field.description as Record<string, string> | undefined)?.[language];
                if (!text) continue;
                expect(seen.has(text) ? `${key} repeats ${seen.get(text)}` : 'unique').toBe('unique');
                seen.set(text, key);
            }
        }
    });

    it('a list setting names every value its schema accepts, so no option is shown by its key', () => {
        for (const key of ['resize', 'skin', 'contentCss', 'toolbarMode'] as const) {
            const accepted = (configSchema.shape[key] as unknown as { _def: { innerType: { _def: { options: Array<{ options?: string[]; value?: string }> } } } })
                ._def.innerType._def.options.flatMap((branch) => branch.options ?? (branch.value === undefined ? [] : [branch.value]))
                .filter((value) => value !== '');
            expect(declared[key]!.options?.map((option) => option.value)).toEqual(accepted);
        }
    });
});
