// @vitest-environment jsdom
/**
 * EditorWysywigMceDetailPanel -- Unit Tests
 *
 * Tests the read-only HTML preview panel.
 * Rules (TESTING_STANDARDS.md): min 2 sad paths per happy path.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EditorWysywigMceDetailPanel } from './EditorWysywigMceDetailPanel';

afterEach(() => cleanup());

const buildCtx = (overrides: Record<string, unknown> = {}) => ({
    projectId: 42,
    instanceKey: 'default',
    lang: 'en' as const,
    data: {
        content: '<p>Hello <strong>world</strong></p>',
    },
    ...overrides,
});

describe('EditorWysywigMceDetailPanel (detail_panel slot)', () => {

    // ── Happy path: renders preview with HTML content ──────────────────────
    it('should render preview container when content is provided', () => {
        render(<EditorWysywigMceDetailPanel context={buildCtx()} />);
        expect(screen.getByTestId('preview-container')).toBeTruthy();
        expect(screen.getByTestId('preview-content')).toBeTruthy();
    });

    // ── Happy path: renders the HTML string from context.data.content ───────
    it('should render the HTML content from context.data', () => {
        render(<EditorWysywigMceDetailPanel context={buildCtx()} />);
        const previewEl = screen.getByTestId('preview-content');
        expect(previewEl.innerHTML).toContain('<strong>world</strong>');
    });

    // ── Sad path: shows empty state when content is empty string ────────────
    it('should render empty state when content is empty string', () => {
        const ctx = buildCtx({ data: { content: '' } });
        render(<EditorWysywigMceDetailPanel context={ctx} />);
        expect(screen.getByTestId('preview-empty')).toBeTruthy();
        expect(screen.queryByTestId('preview-content')).toBeNull();
    });

    // ── Sad path: shows empty state when context.data is undefined ───────────
    it('should render empty state when context.data is undefined', () => {
        const ctx = buildCtx({ data: undefined });
        render(<EditorWysywigMceDetailPanel context={ctx} />);
        expect(screen.getByTestId('preview-empty')).toBeTruthy();
    });

    // ── Sad path: renders without crash when projectId is 0 ─────────────────
    it('should render without crash when projectId is 0', () => {
        const ctx = buildCtx({ projectId: 0 });
        render(<EditorWysywigMceDetailPanel context={ctx} />);
        expect(screen.getByTestId('preview-container')).toBeTruthy();
    });

    // ── Happy path: uses custom label from context.data.label ───────────────
    it('should display custom label when context.data.label is provided', () => {
        const ctx = buildCtx({ data: { content: '<p>Test</p>', label: 'My Custom Label' } });
        render(<EditorWysywigMceDetailPanel context={ctx} />);
        expect(screen.getByText('My Custom Label')).toBeTruthy();
    });
});
