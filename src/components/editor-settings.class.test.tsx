// @vitest-environment jsdom
/**
 * Kernel prompt 131 — the class test: EVERY setting the form saves reaches the editor, wherever it stands — on its
 * own page and in another module's slot (the post editor). Measured 2026-10-20: the editor read its settings from
 * the embedding's `config` (and a dead `data.config`), so none of the 18 saved settings ever reached it.
 *
 * The kernel hands a module its settings under ONE field, `context.moduleSettings`, in both places. The embedding's
 * own `config` stands over them; the host's `data` is never read as the editor's settings.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { configSchema } from '../../definition';
import { EditorWysywigMceTable } from './EditorWysywigMceTable';
import { PostEditorSlot } from './PostEditorSlot';

vi.mock('../lib/tinyMceLoader', () => ({
    QUANTI_TINYMCE_CDN_URL: 'https://cdn.example/libs/tinymce/tinymce.min.js',
    loadTinyMceFromQuantiCdn: () => Promise.resolve(),
}));

let inits: Array<Record<string, unknown>> = [];
beforeEach(() => {
    inits = [];
    (window as any).tinymce = {
        init: vi.fn((opts: Record<string, unknown>) => { inits.push(opts); }),
        get: vi.fn(() => null),
        remove: vi.fn(),
    };
});
afterEach(() => { cleanup(); delete (window as any).tinymce; });

/** Each declared setting → the TinyMCE option it drives, and a saved value that differs from its default. */
const CASES: Array<{ key: string; option: string; saved: unknown; expected: unknown }> = [
    { key: 'width', option: 'width', saved: 640, expected: 640 },
    { key: 'height', option: 'height', saved: 320, expected: 320 },
    { key: 'resize', option: 'resize', saved: 'both', expected: 'both' },
    { key: 'menubar', option: 'menubar', saved: true, expected: true },
    { key: 'statusbar', option: 'statusbar', saved: false, expected: false },
    { key: 'toolbarSticky', option: 'toolbar_sticky', saved: true, expected: true },
    { key: 'branding', option: 'branding', saved: true, expected: true },
    { key: 'skin', option: 'skin', saved: 'oxide-dark', expected: 'oxide-dark' },
    { key: 'contentCss', option: 'content_css', saved: 'writer', expected: 'writer' },
    { key: 'contentStyle', option: 'content_style', saved: 'body{color:red}', expected: 'body{color:red}' },
    { key: 'plugins', option: 'plugins', saved: 'lists link', expected: 'lists link' },
    { key: 'toolbar', option: 'toolbar', saved: 'bold italic', expected: 'bold italic' },
    { key: 'toolbarMode', option: 'toolbar_mode', saved: 'sliding', expected: 'sliding' },
    { key: 'browserSpellcheck', option: 'browser_spellcheck', saved: false, expected: false },
    { key: 'pasteAsText', option: 'paste_as_text', saved: true, expected: true },
    { key: 'pasteDataImages', option: 'paste_data_images', saved: false, expected: false },
    { key: 'automaticUploads', option: 'automatic_uploads', saved: false, expected: false },
];

const own = (values: Record<string, unknown>) => ({
    moduleId: 'editor-wysywig-mce', instanceKey: 'default', values,
    from: Object.fromEntries(Object.keys(values).map((k) => [k, 'module'])),
});

const PLACES = [
    {
        name: 'its own page',
        mount: (ctx: Record<string, unknown>) => render(<EditorWysywigMceTable context={{ projectId: 17, instanceKey: 'default', lang: 'en', data: ctx.moduleSettings ? (ctx.moduleSettings as { values: unknown }).values : {}, ...ctx }} />),
    },
    {
        name: 'the post editor\'s slot',
        // The host's context rides along: Posts' own settings in `data`, its record in `value`.
        mount: (ctx: Record<string, unknown>) => render(<PostEditorSlot context={{ projectId: 17, instanceKey: 'default', lang: 'en', data: { itemsPerPage: 10, height: 999 }, hostModuleId: 'posts', value: '<p>x</p>', onChange: () => undefined, ...ctx }} />),
    },
];

async function initFor(place: (typeof PLACES)[number], ctx: Record<string, unknown>) {
    await act(async () => { place.mount(ctx); });
    await act(async () => { await Promise.resolve(); });
    expect(inits.length).toBeGreaterThan(0);
    return inits.at(-1)!;
}

describe('every saved setting reaches the editor — on its own page and in another module\'s slot', () => {
    for (const place of PLACES) {
        it(`${place.name}: all ${CASES.length} saved settings drive TinyMCE`, async () => {
            const saved = Object.fromEntries(CASES.map((c) => [c.key, c.saved]));
            const init = await initFor(place, { moduleSettings: own(saved) });
            for (const c of CASES) expect([c.key, init[c.option]]).toEqual([c.key, c.expected]);
        });

        it(`${place.name}: the embedding's own configuration stands over the settings`, async () => {
            const init = await initFor(place, { moduleSettings: own({ height: 320, menubar: true }), config: { height: 700 } });
            expect(init.height).toBe(700);
            expect(init.menubar).toBe(true);
        });

        it(`${place.name}: nothing saved — the declared defaults`, async () => {
            const init = await initFor(place, {});
            const declared = configSchema.parse({});
            expect(init.height).toBe(declared.height);
            expect(init.menubar).toBe(declared.menubar);
            expect(init.plugins).toBe(declared.plugins);
            expect(init.toolbar).toBe(declared.toolbar);
            expect(init.skin).toBe(declared.skin);
        });

        it(`${place.name}: the dead \`data.config\` and another module's settings are never read`, async () => {
            const init = await initFor(place, {
                data: { config: { height: 111 }, height: 999 },
                moduleSettings: { moduleId: 'posts', instanceKey: 'default', values: { height: 888 }, from: { height: 'module' } },
            });
            expect(init.height).toBe(configSchema.parse({}).height);
        });
    }

    it('no declared setting is left without a reader', () => {
        const declared = Object.keys(configSchema.shape).sort();
        expect(declared).toEqual(CASES.map((c) => c.key).sort());
    });
});
