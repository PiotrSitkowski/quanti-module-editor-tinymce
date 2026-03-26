/**
 * EditorWysywigMceDashboardWidget -- Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorWysywigMceDashboardWidget } from './EditorWysywigMceDashboardWidget';
import { vi } from 'vitest';

const buildCtx = () => ({
    projectId: 42,
    instanceKey: 'default',
    lang: 'en' as const,
    data: {},
    api: {},
});

describe('EditorWysywigMceDashboardWidget (dashboard_widget slot)', () => {
    it('should render the editor container (delegates to Table)', () => {
        render(<EditorWysywigMceDashboardWidget context={buildCtx()} />);
        expect(screen.getByTestId('editor-container')).toBeTruthy();
    });
});
