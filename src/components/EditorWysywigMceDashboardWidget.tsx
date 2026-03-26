/**
 * EditorWysywigMceDashboardWidget -- Slot: dashboard_widget
 *
 * User requested ONLY the editor to be visible, regardless of whether 
 * it's embedded as a dashboard widget or a main view, with NO titles, 
 * buttons, or extra info.
 */

import { EditorWysywigMceTable } from './EditorWysywigMceTable.js';

export function EditorWysywigMceDashboardWidget(props: any) {
    return <EditorWysywigMceTable {...props} />;
}

export default EditorWysywigMceDashboardWidget;
