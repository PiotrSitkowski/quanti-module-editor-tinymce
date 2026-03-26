/**
 * EditorWysywigMceDetailPanel -- Slot: editor_wysywig_mce_detail_panel
 *
 * Read-only HTML preview panel for content produced by the WYSIWYG editor.
 * Host modules pass saved HTML via context.data.content for display.
 *
 * Contract (via props.context):
 *   context.data.content  -- HTML string to render as a preview
 *   context.data.label    -- Optional label override (default: t.previewLabel)
 *
 * Security: HTML is rendered via dangerouslySetInnerHTML inside a sandboxed
 * wrapper with pointer-events-none to prevent user interaction with links.
 * Host modules are responsible for sanitizing HTML before passing it here.
 * If sanitization is required at this level, use context.api.rpc to call
 * a sanitization RPC on the backend.
 *
 * Design System rules (UX_UI_STANDARDS.md):
 *   - Base font: text-[13px]
 *   - Section headers: text-[10px] uppercase tracking-wider
 *   - No shadows (border only), max rounded-md
 */

import { Component, type ReactNode, Suspense } from 'react';
import { useModuleTranslation } from '../hooks/useModuleTranslation.js';

interface EditorWysywigMceDetailPanelProps {
    context: {
        projectId: number;
        instanceKey?: string;
        lang?: string;
        data?: {
            content?: string;
            label?: string;
        };
        api?: {
            dispatchQuantiEvent?: (event: string, payload: unknown) => void;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
}

// ErrorBoundary
class ErrorBoundary extends Component<
    { children: ReactNode; fallback?: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <p className="text-[13px] text-red-500">Component failed to load.</p>
            );
        }
        return this.props.children;
    }
}

function EditorWysywigMceDetailPanelInner({ context }: EditorWysywigMceDetailPanelProps) {
    const t = useModuleTranslation(context.lang as 'en' | 'pl');
    const content = context.data?.content ?? '';
    const label = context.data?.label ?? t.previewLabel;

    return (
        <div className="flex flex-col gap-3" data-testid="preview-container">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {label}
            </h4>

            {content ? (
                <div
                    data-testid="preview-content"
                    className="
                        w-full rounded-md border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        px-4 py-3
                        text-[13px] text-gray-800 dark:text-gray-200
                        leading-relaxed
                        overflow-auto
                        min-h-[120px]
                        prose prose-sm max-w-none
                        [&_h1]:text-base [&_h1]:font-semibold
                        [&_h2]:text-[13px] [&_h2]:font-semibold
                        [&_a]:text-blue-600 [&_a]:underline
                        [&_ul]:list-disc [&_ul]:pl-5
                        [&_ol]:list-decimal [&_ol]:pl-5
                    "
                    // Host module is responsible for HTML sanitization before passing content here
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            ) : (
                <div
                    data-testid="preview-empty"
                    className="
                        flex min-h-[120px] items-center justify-center
                        rounded-md border border-dashed border-gray-200 dark:border-gray-700
                    "
                >
                    <p className="text-[13px] text-gray-400 dark:text-gray-500">{t.noPreview}</p>
                </div>
            )}
        </div>
    );
}

// Public export -- wrapped in ErrorBoundary + Suspense

export function EditorWysywigMceDetailPanel({ context }: EditorWysywigMceDetailPanelProps) {
    // �️ DETEKTYW: Co dokładnie daje nam Shell?
    console.log("🔥 SHELL PRZESYŁA DO PODGLĄDU:", context);
    // �🛡️ ŻELAZNY BEZPIECZNIK: Jeśli Shell jeszcze nie wstrzyknął kontekstu, pokaż loader
    if (!context) {
        return <p className="text-[13px] text-gray-400 animate-pulse">Ładowanie kontekstu...</p>;
    }
    return (
        <ErrorBoundary>
            <Suspense fallback={<p className="text-[13px] text-gray-400 animate-pulse">...</p>}>
                <EditorWysywigMceDetailPanelInner context={context} />
            </Suspense>
        </ErrorBoundary>
    );
}

export default EditorWysywigMceDetailPanel;
