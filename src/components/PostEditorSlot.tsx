/**
 * PostEditorSlot — Slot: post_editor (producer dla modułu `posts`)
 *
 * Adapter TinyMCE dopasowany do kontraktu PostsDefaultEditor:
 *   context.value    — string (aktualna treść HTML, seed + reconcile)
 *   context.onChange — (text: string) => void (wołane przy KAŻDEJ edycji,
 *                       bez niej host nie wykryje dirty-state i Save zostanie zablokowany)
 *   context.postId   — UUID w edycji, undefined w create (tylko do odczytu)
 *   context.hostModuleId / context.instanceKey — metadane od hosta, nie hardkodujemy
 *
 * OBOWIĄZKI (za agentem posts):
 *   - Seed z context.value przy mount; reconcile przy zmianie (np. nawigacja między postami)
 *   - Wołać context.onChange(text) na każdą zmianę treści
 *   - NIE emitować posts:editor:save/cancel/saved/error — to owned przez PostsEditorActions
 *   - NIE wołać context.rpc('posts', 'create'|'update', …) — host zapisuje sam
 *   - a11y: id="posts-editor-content" na edytowalnym roocie (powiązanie z hostowym <Label>)
 *
 * TinyMCE ładowany z Quanti CDN (R2) przez loadTinyMceFromQuantiCdn — lib-Isolation Rule.
 * Konfiguracja edytora pochodzi z context.config (tenant-level) z sensownymi defaultami.
 */

import { Component, type ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import { useModuleTranslation, resolveLang } from '../hooks/useModuleTranslation.js';
import { loadTinyMceFromQuantiCdn, QUANTI_TINYMCE_CDN_URL } from '../lib/tinyMceLoader.js';

declare global {
    interface Window {
        tinymce?: any;
    }
}

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

interface PostEditorSlotProps {
    context: {
        projectId?: number | string;
        instanceKey?: string;
        lang?: string;
        hostModuleId?: string;
        postId?: string;
        value?: string;
        onChange?: (text: string) => void;
        config?: EditorConfigFromContext;
        [key: string]: unknown;
    };
}

// a11y: root edytora musi mieć to id — PostsDefaultEditor ma <Label htmlFor="posts-editor-content">
const POSTS_EDITOR_DOM_ID = 'posts-editor-content';

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

const LANG_MAP: Record<string, string> = { pl: 'pl', en: 'en_US' };

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

function PostEditorSlotInner({ context }: PostEditorSlotProps) {
    const t = useModuleTranslation(resolveLang(context));
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<any>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const cfg = context.config ?? {};
    // `|| 500` — Kernel może przechować 0 (AutoForm wysyła 0 dla pustego pola number)
    const height            = cfg.height           || 500;
    const width             = cfg.width            ?? 'auto';
    const resize            = cfg.resize           ?? 'true';
    const menubar           = cfg.menubar          ?? false;
    const statusbar         = cfg.statusbar        ?? true;
    const toolbarSticky     = cfg.toolbarSticky    ?? false;
    const branding          = cfg.branding         ?? false;
    const skin              = cfg.skin             ?? 'oxide';
    const contentCss        = cfg.contentCss       ?? 'default';
    const contentStyle      = cfg.contentStyle     || DEFAULT_CONTENT_STYLE;
    const plugins           = cfg.plugins          ?? DEFAULT_PLUGINS;
    const toolbar           = cfg.toolbar          ?? DEFAULT_TOOLBAR;
    const toolbarMode       = cfg.toolbarMode      ?? 'floating';
    const browserSpellcheck = cfg.browserSpellcheck ?? true;
    const pasteAsText       = cfg.pasteAsText      ?? false;
    const pasteDataImages   = cfg.pasteDataImages  ?? true;
    const automaticUploads  = cfg.automaticUploads ?? true;

    const tinyLang = LANG_MAP[resolveLang(context)] ?? 'en_US';
    const resizeValue: boolean | 'both' =
        resize === 'false' ? false : resize === 'both' ? 'both' : true;
    const widthValue = width === 'auto' ? undefined : width;

    // onChange w refie — żeby init TinyMCE był idempotentny (jeden mount/destroy cykl)
    // a aktualna funkcja hosta była czytana na każdym keystroke
    const onChangeRef = useRef(context.onChange);
    useEffect(() => { onChangeRef.current = context.onChange; }, [context.onChange]);

    // Mount TinyMCE
    useEffect(() => {
        let destroyed = false;
        const baseUrl = QUANTI_TINYMCE_CDN_URL.replace('/tinymce.min.js', '');

        loadTinyMceFromQuantiCdn()
            .then(() => {
                if (destroyed || !editorRef.current) return;

                window.tinymce.init({
                    target: editorRef.current,
                    license_key: 'gpl',
                    base_url: baseUrl,
                    suffix: '.min',
                    language: tinyLang,
                    ...(widthValue !== undefined ? { width: widthValue } : {}),
                    height,
                    resize: resizeValue,
                    menubar,
                    statusbar,
                    toolbar_sticky: toolbarSticky,
                    branding,
                    promotion: false,
                    skin,
                    content_css: contentCss,
                    content_style: contentStyle,
                    plugins,
                    toolbar,
                    toolbar_mode: toolbarMode,
                    browser_spellcheck: browserSpellcheck,
                    paste_as_text: pasteAsText,
                    paste_data_images: pasteDataImages,
                    automatic_uploads: automaticUploads,
                    setup: (editor: any) => {
                        editor.on('init', () => {
                            if (destroyed) return;
                            editorInstanceRef.current = editor;
                            setIsLoading(false);
                            const seed = context.value ?? '';
                            if (seed) editor.setContent(seed);
                        });
                        editor.on('input Change KeyUp Undo Redo', () => {
                            if (destroyed) return;
                            onChangeRef.current?.(editor.getContent());
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
            const inst = editorInstanceRef.current;
            if (inst && typeof inst.destroy === 'function') inst.destroy();
            editorInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reconcile gdy host podmieni context.value (np. nawigacja na inny post).
    // Porównanie z aktualną treścią edytora zapobiega pętli setContent → onChange → setContent.
    useEffect(() => {
        const inst = editorInstanceRef.current;
        if (!inst) return;
        const next = context.value ?? '';
        const current = inst.getContent();
        if (next !== current) {
            inst.setContent(next);
        }
    }, [context.value]);

    if (hasError) {
        return (
            <div
                className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-4"
                data-testid="post-editor-error"
            >
                <p className="text-[13px] text-red-600">{t.errorText}</p>
            </div>
        );
    }

    return (
        <div
            className="w-full relative"
            style={{ minHeight: `${height}px` }}
            data-testid="post-editor-container"
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10 rounded-md">
                    <p className="text-[13px] text-gray-400 animate-pulse">{t.loadingText}</p>
                </div>
            )}
            <div
                id={POSTS_EDITOR_DOM_ID}
                ref={editorRef}
                data-testid="post-editor-textarea"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700"
                style={{ height: `${height}px` }}
            />
        </div>
    );
}

export function PostEditorSlot(props: any) {
    const context = props.context;
    if (!context) {
        return (
            <p
                className="text-[13px] text-gray-400 animate-pulse"
                data-testid="post-editor-context-loader"
            >
                {`Loading context...`}
            </p>
        );
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={<p className="text-[13px] text-gray-400 animate-pulse">...</p>}>
                <PostEditorSlotInner context={context} />
            </Suspense>
        </ErrorBoundary>
    );
}

export default PostEditorSlot;
