/**
 * @file src/components/locale-channel.test.tsx
 * @module editor-wysywig-mce
 *
 * RED for the FaD i18n regression (fleet-wide sweep 2026-08-02, first seen
 * on categories prod). The shell has TWO language channels: the FaD path
 * (PlacementBoundary) threads `context.locale`, the legacy module page
 * threads `context.lang`. Reading only `lang` makes every FaD-rendered
 * surface EN-only. Contract: resolve through BOTH channels, en default.
 */
import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { resolveLang } from '../hooks/useModuleTranslation';
import { EditorWysywigMceTable } from './EditorWysywigMceTable';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

// FaD context: locale only — exactly what PlacementBoundary injects.
// No window.tinymce → the component stays in its loading state, which is
// rendered through t.loadingText (i18n-observable without booting TinyMCE).
const fadContext = (overrides: Record<string, unknown> = {}) => ({
    projectId:   42,
    instanceKey: 'default',
    data:        {},
    actions:     {},
    ...overrides,
});

describe('resolveLang — dual-channel language resolution', () => {
    it('reads context.locale (FaD channel)', () => {
        expect(resolveLang({ locale: 'pl' })).toBe('pl');
    });

    it('reads context.lang (legacy page channel)', () => {
        expect(resolveLang({ lang: 'pl' })).toBe('pl');
    });

    it('defaults to en on empty/unknown context', () => {
        expect(resolveLang(undefined)).toBe('en');
        expect(resolveLang({})).toBe('en');
        expect(resolveLang({ locale: 'de' })).toBe('en');
    });
});

describe('FaD locale-only context renders Polish (prod failure mode)', () => {
    it('EditorWysywigMceTable: loading state is Polish with locale=pl and no lang', () => {
        render(<EditorWysywigMceTable context={fadContext({ locale: 'pl' }) as never} />);
        expect(screen.getByText('Ładowanie edytora...')).toBeTruthy();
        expect(screen.queryByText('Loading editor...')).toBeNull();
    });

    it('EditorWysywigMceTable: stays English when neither channel is present', () => {
        render(<EditorWysywigMceTable context={fadContext() as never} />);
        expect(screen.getByText('Loading editor...')).toBeTruthy();
    });
});
