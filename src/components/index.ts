/**
 * EditorWysywigMceModule — Component Re-exports
 *
 * All React components exposed by this module's MFE bundle.
 * Each component maps to a uiExtension slot in definition.ts.
 */

export { EditorWysywigMceTable } from './EditorWysywigMceTable';
export { EditorWysywigMceDetailPanel } from './EditorWysywigMceDetailPanel';

// Dodajemy 'as', żeby bundle zawierał DOKŁADNIE to, czego szuka Shell
export { EditorWysywigMceDashboardWidget as EditorWysywigMceWidget } from './EditorWysywigMceDashboardWidget';