// @vitest-environment jsdom
/**
 * EditorWysywigMceTable -- Unit Tests
 *
 * TDD: tests cover the pure UI contract of the WYSIWYG editor slot.
 * TinyMCE CDN script is mocked (no real network in tests).
 *
 * Rules (TESTING_STANDARDS.md):
 *   - Test via component props (black-box)
 *   - Mock only external calls (CDN script load)
 *   - min 2 sad paths per happy path
 *   - Ratios: 2 error tests per 1 happy-path test
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { EditorWysywigMceTable } from './EditorWysywigMceTable';

// Mock TinyMCE CDN loading -- no real network in tests
beforeEach(() => {
    // Simulate tinymce already loaded on window
    (window as any).tinymce = {
        init: vi.fn(({ setup }: { setup: (editor: any) => void }) => {
            // Immediately call setup with a mock editor
            const mockEditor = {
                on: vi.fn((events: string, cb: () => void) => {
                    if (events.includes('init')) cb();
                }),
                setContent: vi.fn(),
                getContent: vi.fn(() => '<p>Hello world</p>'),
                destroy: vi.fn(),
            };
            setup?.(mockEditor);
        }),
        get: vi.fn(() => ({
            getContent: vi.fn(() => '<p>Saved content</p>'),
            destroy: vi.fn(),
        })),
        remove: vi.fn(),
    };
});

afterEach(() => {
    cleanup();
    delete (window as any).tinymce;
    vi.restoreAllMocks();
});

// Factory -- builds a valid context object (extended with context.config per plan §5.2)
const buildCtx = (overrides: Record<string, unknown> = {}) => ({
    projectId: 42,
    instanceKey: 'default',
    lang: 'en' as const,
    config: {
        height: 500,
        width: 'auto' as const,
        resize: 'true' as const,
        menubar: false,
        statusbar: true,
        toolbarSticky: false,
        branding: false,
        skin: 'oxide' as const,
        contentCss: 'default' as const,
        contentStyle: '',
        plugins: 'lists link autolink code wordcount',
        toolbar: 'bold italic | link',
        toolbarMode: 'floating' as const,
        browserSpellcheck: true,
        pasteAsText: false,
        pasteDataImages: true,
        automaticUploads: true,
        tinyMceApiKey: '',
    },
    data: {
        initialContent: '',
        tinyMceApiKey: 'test-api-key-123',
    },
    actions: {
        onChange: vi.fn(),
        onSave:   vi.fn(),
        onCancel: vi.fn(),
    },
    api: {
        dispatchQuantiEvent: vi.fn(),
    },
    ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 RED SUITE: Quanti CDN Migration — tests WILL FAIL until implementation
//
// These tests verify the three requirements of the CDN migration task:
//   1. Script tag points to cdn.quanti-system.cloud (not cdn.tiny.cloud)
//   2. Guard Clause: empty/null context renders Loader, not crashing
//   3. lib-Isolation: loader function lives in src/lib/tinyMceLoader (not component)
//
// HOW TO MAKE GREEN:
//   - Create src/lib/tinyMceLoader.ts exporting `loadTinyMceFromQuantiCdn`
//   - Update EditorWysywigMceTable to use it (no inline loadTinyMceCdn)
//   - Ensure script.src starts with https://cdn.quanti-system.cloud/
// ─────────────────────────────────────────────────────────────────────────────

describe('EditorWysywigMceTable — Quanti CDN Migration [RED]', () => {

    it('[RED-1] should inject <script> with Quanti CDN URL (cdn.quanti-system.cloud)', () => {
        // Arrange: tinymce NOT pre-loaded so the loader must inject a script tag
        delete (window as any).tinymce;
        const appendChildSpy = vi.spyOn(document.head, 'appendChild');

        // Act
        render(<EditorWysywigMceTable context={buildCtx()} />);

        // Assert: at least one injected script must point to Quanti CDN
        const injectedScripts = appendChildSpy.mock.calls
            .map((args) => args[0] as HTMLScriptElement)
            .filter((el) => el.tagName === 'SCRIPT');

        const quantiCdnScript = injectedScripts.find((s) =>
            s.src?.startsWith('https://cdn.quanti-system.cloud/')
        );

        expect(
            quantiCdnScript,
            'Expected a <script> tag pointing to cdn.quanti-system.cloud — found none. ' +
            'Injected srcs: ' + injectedScripts.map((s) => s.src).join(', ')
        ).toBeDefined();

        appendChildSpy.mockRestore();
    });

    it('[RED-2] should render a Loader element when context prop is absent (Guard Clause)', () => {
        // Simulate the race-condition on production: Shell sends empty props {}
        // The component MUST NOT throw — it must render a non-crashing fallback.
        render(<EditorWysywigMceTable />);

        // There must be NO editor-container (editor is not ready yet)
        expect(screen.queryByTestId('editor-container')).toBeNull();

        // There must be a loading indicator with data-testid="context-loader"
        // (this testid is part of the new Guard Clause implementation contract)
        expect(
            screen.getByTestId('context-loader'),
            'Guard Clause must render data-testid="context-loader" when context is missing'
        ).toBeTruthy();
    });

    it('[RED-3] lib-Isolation: loadTinyMceFromQuantiCdn must be importable from src/lib/tinyMceLoader', async () => {
        // This test verifies the lib-Isolation Rule:
        // The CDN loader logic must NOT live inside the component file.
        // It must be a standalone function exported from src/lib/tinyMceLoader.ts

        // Dynamic import — will FAIL (throw) until the file is created
        const loaderModule = await import('../lib/tinyMceLoader.js');

        expect(
            typeof loaderModule.loadTinyMceFromQuantiCdn,
            'src/lib/tinyMceLoader must export a function named loadTinyMceFromQuantiCdn'
        ).toBe('function');
    });
});

describe('EditorWysywigMceTable (main_view slot)', () => {

    // ── Happy path: renders editor container ────────────────────────────────
    it('should render the editor container with valid context', () => {
        render(<EditorWysywigMceTable context={buildCtx()} />);
        expect(screen.getByTestId('editor-container')).toBeTruthy();
    });

    // ── Sad path: renders without crash when context.data is undefined ───────
    it('should render without crashing when context.data is undefined', () => {
        const ctx = buildCtx({ data: undefined, actions: {} });
        render(<EditorWysywigMceTable context={ctx} />);
        expect(screen.getByTestId('editor-container')).toBeTruthy();
    });

    // ── Sad path: renders without crash when projectId is 0 ─────────────────
    it('should render without crash when projectId is 0', () => {
        const ctx = buildCtx({ projectId: 0 });
        render(<EditorWysywigMceTable context={ctx} />);
        expect(screen.getByTestId('editor-container')).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 RED SUITE: context.config — TDD dla planu §5 (tinymce-configuration-plan)
//
// Testy weryfikują:
//   1. context.config jest priorytetem nad context.data.config (backward compat)
//   2. Wszystkie 16 pól jest przekazywanych do tinymce.init
//   3. Mapowanie lang → TinyMCE language
//   4. Iron Guard dla null/undefined context
// ─────────────────────────────────────────────────────────────────────────────

describe('EditorWysywigMceTable — Config from context.config [TDD §5]', () => {

    // ── Happy path: pełna konfiguracja ───────────────────────────────────────
    it('renders with full context.config — no errors thrown', async () => {
        const ctx = buildCtx();
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect(screen.getByTestId('editor-container')).toBeTruthy();
    });

    // ── Happy path: puste config — defaulty z planu ──────────────────────────
    it('renders with empty config {} — default height 500 applies', async () => {
        const ctx = buildCtx({ config: {} });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect(screen.getByTestId('editor-container')).toBeTruthy();
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ height: 500 })
        );
    });

    // ── Happy path: brak klucza config — Iron Guard + defaulty ───────────────
    it('renders without context.config key — Iron Guard + defaults', async () => {
        const ctx = buildCtx({ config: undefined });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect(screen.getByTestId('editor-container')).toBeTruthy();
    });

    // ── Happy path: height z context.config ─────────────────────────────────
    it('tinymce.init called with height 800 from context.config', async () => {
        const baseConfig = buildCtx().config;
        const ctx = buildCtx({ config: { ...baseConfig, height: 800 } });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ height: 800 })
        );
    });

    // ── Happy path: skin oxide-dark z context.config ─────────────────────────
    it('tinymce.init called with skin oxide-dark from context.config', async () => {
        const baseConfig = buildCtx().config;
        const ctx = buildCtx({ config: { ...baseConfig, skin: 'oxide-dark' } });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ skin: 'oxide-dark' })
        );
    });

    // ── Happy path: mapowanie lang pl → TinyMCE 'pl' ─────────────────────────
    it('lang pl maps to TinyMCE language pl', async () => {
        const ctx = buildCtx({ lang: 'pl' });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ language: 'pl' })
        );
    });

    // ── Happy path: mapowanie lang en → TinyMCE 'en_US' ─────────────────────
    it('lang en maps to TinyMCE language en_US', async () => {
        const ctx = buildCtx({ lang: 'en' });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ language: 'en_US' })
        );
    });

    // ── Sad path: context=null → context-loader (Iron Guard) ─────────────────
    it('context=null renders context-loader — Iron Guard prevents crash', () => {
        render(<EditorWysywigMceTable context={null as any} />);
        expect(screen.queryByTestId('editor-container')).toBeNull();
        expect(screen.getByTestId('context-loader')).toBeTruthy();
    });

    // ── Sad path: context=undefined → context-loader (Iron Guard) ────────────
    it('context=undefined renders context-loader — Iron Guard prevents crash', () => {
        render(<EditorWysywigMceTable />);
        expect(screen.queryByTestId('editor-container')).toBeNull();
        expect(screen.getByTestId('context-loader')).toBeTruthy();
    });

    // ── Config: menubar=true przekazane do tinymce.init ──────────────────────
    it('config.menubar=true is passed to tinymce.init', async () => {
        const baseConfig = buildCtx().config;
        const ctx = buildCtx({ config: { ...baseConfig, menubar: true } });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ menubar: true })
        );
    });

    // ── Backward compat: legacy context.data.config.height ───────────────────
    it('legacy context.data.config.height used when context.config absent', async () => {
        const ctx = buildCtx({
            config: undefined,
            data: { initialContent: '', config: { height: 700 } },
        });
        await act(async () => { render(<EditorWysywigMceTable context={ctx} />); });
        expect((window as any).tinymce.init).toHaveBeenCalledWith(
            expect.objectContaining({ height: 700 })
        );
    });
});
