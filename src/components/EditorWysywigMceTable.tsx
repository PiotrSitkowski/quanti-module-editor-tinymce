/**
 * EditorWysywigMceTable -- Slot: editor_wysywig_mce_main_view
 *
 * Pure WYSIWYG editor component using TinyMCE Cloud CDN.
 * This module has NO database -- it is a reusable UI primitive.
 *
 * Contract (via props.context):
 *   context.data.initialContent  -- HTML string to pre-populate the editor
 *   context.data.tinyMceApiKey   -- Override API key (falls back to config)
 *   context.data.config          -- Optional TinyMCE init overrides (toolbar, plugins, height)
 *   context.actions.onChange     -- Called on every content change with (html: string)
 *   context.actions.onSave       -- Called when user clicks Save with (html: string)
 *   context.actions.onCancel     -- Called when user clicks Cancel
 *
 * TinyMCE is loaded via CDN <script> tag in useEffect (see override-tinymce-cdn.md).
 *
 * Design System rules (UX_UI_STANDARDS.md):
 *   - Base font: text-[13px]
 *   - Section headers: text-[10px] uppercase tracking-wider
 *   - No shadows (border only), max rounded-md
 *
 * i18n: NEVER hardcode user-visible strings -- use t.key from useModuleTranslation
 * Modals: NEVER use native browser dialogs -- use context.api?.dispatchQuantiEvent(...)
 */

import { Component, type ReactNode, Suspense, useEffect, useRef, useState, useCallback, useId } from 'react';
import { useModuleTranslation } from '../hooks/useModuleTranslation.js';
import { loadTinyMceFromQuantiCdn, QUANTI_TINYMCE_CDN_URL } from '../lib/tinyMceLoader.js';

// TinyMCE is loaded from CDN -- not bundled. type-only reference.
declare global {
    interface Window {
        tinymce?: any;
    }
}

interface TinyMceConfig {
    toolbar?: string;
    plugins?: string;
    height?: number;
    menubar?: boolean;
    [key: string]: unknown;
}

interface EditorWysywigMceTableProps {
    context: {
        projectId: number;
        instanceKey?: string;
        lang?: string;
        data?: {
            initialContent?: string;
            tinyMceApiKey?: string;
            config?: TinyMceConfig;
        };
        actions?: {
            onChange?: (html: string) => void;
            onSave?: (html: string) => void;
            onCancel?: () => void;
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

// Loader przeniesiony do src/lib/tinyMceLoader.ts (lib-Isolation Rule)
// Używamy loadTinyMceFromQuantiCdn importowanego powyżej.

// Inner component -- TinyMCE editor
function EditorWysywigMceTableInner({ context }: EditorWysywigMceTableProps) {
    const t = useModuleTranslation(context.lang as 'en' | 'pl');
    const editorRef = useRef<HTMLDivElement>(null);
    const editorId = `tinymce-editor-${useId().replace(/:/g, '')}`;

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentHtml, setCurrentHtml] = useState(context.data?.initialContent ?? '');

    const userConfig = context.data?.config ?? {};
    const height = (userConfig.height as number) ?? 500;
    const toolbar = (userConfig.toolbar as string) ?? 'undo redo | blocks | bold italic underline strikethrough | bullist numlist | alignleft aligncenter alignright | link | removeformat | code';
    const plugins = (userConfig.plugins as string) ?? 'lists link autolink code wordcount';
    const menubar = (userConfig.menubar as boolean) ?? false;

    const onChangeRef = useRef(context.actions?.onChange);
    const onSaveRef = useRef(context.actions?.onSave);
    const onCancelRef = useRef(context.actions?.onCancel);
    useEffect(() => { onChangeRef.current = context.actions?.onChange; }, [context.actions?.onChange]);
    useEffect(() => { onSaveRef.current = context.actions?.onSave; }, [context.actions?.onSave]);
    useEffect(() => { onCancelRef.current = context.actions?.onCancel; }, [context.actions?.onCancel]);

    useEffect(() => {
        let destroyed = false;
        // base_url tells TinyMCE where to find skins/themes/icons on our R2 CDN
        const baseUrl = QUANTI_TINYMCE_CDN_URL.replace('/tinymce.min.js', '');

        loadTinyMceFromQuantiCdn()
            .then(() => {
                if (destroyed || !editorRef.current) return;

                window.tinymce.init({
                    target: editorRef.current,   // ref instead of selector — safer in React
                    license_key: 'gpl',          // required for TinyMCE 7 Community
                    base_url: baseUrl,            // CRITICAL: skins/themes path on R2
                    suffix: '.min',
                    height,
                    toolbar,
                    plugins,
                    menubar,
                    branding: false,
                    promotion: false,
                    statusbar: true,
                    resize: true,
                    skin: 'oxide',
                    content_css: 'default',
                    content_style: `
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            font-size: 13px;
                            line-height: 1.6;
                            color: #111827;
                            margin: 12px;
                        }
                    `,
                    setup: (editor: any) => {
                        editor.on('init', () => {
                            if (destroyed) return;
                            setIsLoading(false);
                            if (context.data?.initialContent) {
                                editor.setContent(context.data.initialContent);
                            }
                        });
                        editor.on('input Change KeyUp', () => {
                            if (destroyed) return;
                            const html = editor.getContent();
                            setCurrentHtml(html);
                            onChangeRef.current?.(html);
                        });
                    },
                });
            })
            .catch(() => {
                if (!destroyed) {
                    setIsLoading(false);
                    setHasError(true);
                }
            });

        return () => {
            destroyed = true;
            if (window.tinymce) {
                const inst = window.tinymce.get(editorId);
                if (inst) inst.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorId]);

    const handleSave = useCallback(() => {
        const html = window.tinymce?.get(editorId)?.getContent() ?? currentHtml;
        onSaveRef.current?.(html);
    }, [editorId, currentHtml]);

    const handleCancel = useCallback(() => {
        onCancelRef.current?.();
    }, []);

    if (hasError) {
        return (
            <div
                className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-4"
                data-testid="editor-error"
            >
                <p className="text-[13px] text-red-600">{t.errorText}</p>
            </div>
        );
    }

    return (
        <div className="w-full relative" style={{ minHeight: `${height}px` }} data-testid="editor-container">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10 rounded-md">
                    <p className="text-[13px] text-gray-400 animate-pulse">{t.loadingText}</p>
                </div>
            )}
            {/* TinyMCE mounts here via ref — height forced so browser doesn't collapse the div */}
            <div
                id={editorId}
                ref={editorRef}
                data-testid="editor-textarea"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700"
                style={{ height: `${height}px` }}
            />
        </div>
    );
}

// Public export -- wrapped in ErrorBoundary + Suspense
// Zmieniamy ({ context }) na ( props ) aby zobaczyć wszystko
export function EditorWysywigMceTable(props: any) {
    const context = props.context;
    // Guard Clause: race-condition – Shell jeszcze nie wstrzyknął kontekstu
    if (!context) {
        return (
            <p
                className="text-[13px] text-gray-400 animate-pulse"
                data-testid="context-loader"
            >
                Ładowanie kontekstu...
            </p>
        );
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={<p className="text-[13px] text-gray-400 animate-pulse">...</p>}>
                <EditorWysywigMceTableInner context={context} />
            </Suspense>
        </ErrorBoundary>
    );
}

export default EditorWysywigMceTable;
