/**
 * EditorWysywigMceModule — Module Entry Point (MFE Bundle)
 *
 * Barrel export for: definition, schema, and all React components.
 * This file is the Vite library entry point.
 */

export { editor_wysywig_mceDefinition } from '../definition';
export { editor_wysywig_mceTable } from '../schema';
export { EditorWysywigMceTable } from './components/EditorWysywigMceTable';
export { EditorWysywigMceDetailPanel } from './components/EditorWysywigMceDetailPanel';

// To jest linia, której szuka Shell!
export { EditorWysywigMceDashboardWidget as EditorWysywigMceWidget } from './components/EditorWysywigMceDashboardWidget';