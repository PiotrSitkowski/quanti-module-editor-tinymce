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
import { useModuleTranslation, resolveLang } from '../hooks/useModuleTranslation.js';
import { loadTinyMceFromQuantiCdn, QUANTI_TINYMCE_CDN_URL } from '../lib/tinyMceLoader.js';

// TinyMCE is loaded from CDN -- not bundled. type-only reference.
declare global {
    interface Window {
        tinymce?: any;
    }
}

// Legacy interface for backward-compat with context.data.config
interface TinyMceConfig {
    toolbar?: string;
    plugins?: string;
    height?: number;
    menubar?: boolean;
    [key: string]: unknown;
}

// New: top-level context.config injected by Kernel (per plan §4.1)
interface EditorConfigFromContext {
    tinyMceApiKey?: string;
    width?: number | 'auto';
    height?: number;
    resize?: 'false' | 'true' | 'both';
    menubar?: boolean;
    statusbar?: boolean;
    toolbarSticky?: boolean;
    branding?: boolean;
    skin?: 'oxide' | 'oxide-dark';
    contentCss?: 'default' | 'dark' | 'document' | 'writer';
    contentStyle?: string;
    plugins?: string;
    toolbar?: string;
    toolbarMode?: 'floating' | 'sliding' | 'scrolling' | 'wrap';
    browserSpellcheck?: boolean;
    pasteAsText?: boolean;
    pasteDataImages?: boolean;
    automaticUploads?: boolean;
}

interface EditorWysywigMceTableProps {
    context: {
        projectId: number;
        instanceKey?: string;
        lang?: string;
        config?: EditorConfigFromContext;   // New: Kernel-injected config (priority)
        data?: {
            initialContent?: string;
            tinyMceApiKey?: string;
            config?: TinyMceConfig;         // Legacy: backward-compat fallback
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

// ── Stałe domyślne (poza komponentem — plan §4.3) ────────────────────────────
const DEFAULT_PLUGINS =
    'advlist autolink lists link image charmap preview anchor ' +
    'searchreplace visualblocks code fullscreen insertdatetime ' +
    'media table help wordcount';

const DEFAULT_TOOLBAR =
    'undo redo | blocks | bold italic underline strikethrough | ' +
    'alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | link image | ' +
    'removeformat | code | fullscreen';

const DEFAULT_CONTENT_STYLE = `
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        line-height: 1.6;
        color: #111827;
        margin: 12px;
    }
`;

// Mapowanie Quanti lang → TinyMCE language code (plan §4.2)
const LANG_MAP: Record<string, string> = { pl: 'pl', en: 'en_US' };

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
    const t = useModuleTranslation(resolveLang(context));
    const editorRef = useRef<HTMLDivElement>(null);
    const editorId = `tinymce-editor-${useId().replace(/:/g, '')}`;

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentHtml, setCurrentHtml] = useState(context.data?.initialContent ?? '');

    // ── Bezpieczna destrukturyzacja z defaultami (plan §4.2 IRON GUARD Pattern) ──
    // Priorytet: context.config (nowe) > context.data.config (legacy) > hardcoded defaults
    const cfg       = context.config ?? {};
    const legacyCfg = context.data?.config ?? {};

    // `|| 500` zamiast `?? 500` — Kernel może przechować 0 (AutoForm wysyła 0 dla pustego pola number).
    const height            = cfg.height           || (legacyCfg.height as number | undefined)   || 500;
    const width             = cfg.width            ?? 'auto';
    const resize            = cfg.resize           ?? 'true';
    const menubar           = cfg.menubar          ?? (legacyCfg.menubar as boolean | undefined)  ?? false;
    const statusbar         = cfg.statusbar        ?? true;
    const toolbarSticky     = cfg.toolbarSticky    ?? false;
    const branding          = cfg.branding         ?? false;
    const skin              = cfg.skin             ?? 'oxide';
    const contentCss        = cfg.contentCss       ?? 'default';
    const contentStyle      = cfg.contentStyle     || DEFAULT_CONTENT_STYLE;
    const plugins           = cfg.plugins          ?? (legacyCfg.plugins as string | undefined)   ?? DEFAULT_PLUGINS;
    const toolbar           = cfg.toolbar          ?? (legacyCfg.toolbar as string | undefined)   ?? DEFAULT_TOOLBAR;
    const toolbarMode       = cfg.toolbarMode      ?? 'floating';
    const browserSpellcheck = cfg.browserSpellcheck ?? true;
    const pasteAsText       = cfg.pasteAsText      ?? false;
    const pasteDataImages   = cfg.pasteDataImages  ?? true;
    const automaticUploads  = cfg.automaticUploads ?? true;

    // Mapowanie języka platformy → TinyMCE language (plan §4.2)
    const tinyLang = LANG_MAP[resolveLang(context)] ?? 'en_US';

    // Konwersja resize string → TinyMCE native type
    const resizeValue: boolean | 'both' =
        resize === 'false' ? false : resize === 'both' ? 'both' : true;

    // Szerokość: 'auto' → undefined (TinyMCE przyjmuje undefined jako 100%)
    const widthValue = width === 'auto' ? undefined : width;

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
                    language: tinyLang,
                    // Layout
                    ...(widthValue !== undefined ? { width: widthValue } : {}),
                    height,
                    resize: resizeValue,
                    menubar,
                    statusbar,
                    toolbar_sticky: toolbarSticky,
                    // Branding
                    branding,
                    promotion: false,            // zawsze false — Quanti white-label
                    // Theming
                    skin,
                    content_css: contentCss,
                    content_style: contentStyle,
                    // Plugins & Toolbar
                    plugins,
                    toolbar,
                    toolbar_mode: toolbarMode,
                    // Behavior
                    browser_spellcheck: browserSpellcheck,
                    paste_as_text: pasteAsText,
                    paste_data_images: pasteDataImages,
                    automatic_uploads: automaticUploads,
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
