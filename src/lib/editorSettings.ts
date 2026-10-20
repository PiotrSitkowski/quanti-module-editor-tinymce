/**
 * The editor's settings, ONE read for every place the editor stands — its own page and another module's slot.
 *
 * The kernel hands a module its settings under `context.moduleSettings` in both places (kernel prompt 131). Until then
 * the editor read the embedding's `config` and a dead `data.config`, and none of the saved settings reached it.
 * The embedding's own `config` stands over the settings (the more specific statement); the host's `data` is the
 * host's and is never read as the editor's settings.
 *
 * The defaults repeat `configSchema` (definition.ts) so the bundle does not carry the manifest; a test holds them equal.
 */
export const EDITOR_MODULE_ID = 'editor-wysywig-mce';

export const DEFAULT_PLUGINS =
    'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount';
export const DEFAULT_TOOLBAR =
    'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | removeformat | code | fullscreen';

export interface EditorSettings {
    width: number | 'auto';
    height: number;
    resize: 'true' | 'false' | 'both';
    menubar: boolean;
    statusbar: boolean;
    toolbarSticky: boolean;
    branding: boolean;
    skin: string;
    contentCss: string;
    contentStyle: string;
    plugins: string;
    toolbar: string;
    toolbarMode: string;
    browserSpellcheck: boolean;
    pasteAsText: boolean;
    pasteDataImages: boolean;
    automaticUploads: boolean;
}

export const EDITOR_SETTING_DEFAULTS: EditorSettings = {
    width: 'auto',
    height: 500,
    resize: 'true',
    menubar: false,
    statusbar: true,
    toolbarSticky: false,
    branding: false,
    skin: 'oxide',
    contentCss: 'default',
    contentStyle: '',
    plugins: DEFAULT_PLUGINS,
    toolbar: DEFAULT_TOOLBAR,
    toolbarMode: 'floating',
    browserSpellcheck: true,
    pasteAsText: false,
    pasteDataImages: true,
    automaticUploads: true,
};

interface SettingsContext {
    moduleSettings?: unknown;
    config?: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const positiveNumber = (v: unknown) => (typeof v === 'number' && v > 0) || (typeof v === 'string' && /^\d+$/.test(v) && Number(v) > 0);

/** A value the editor cannot use is not an answer: the default speaks instead (AutoForm saves `0` and `''` for empty fields). */
function usable(key: keyof EditorSettings, value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (key === 'width') return value === 'auto' || positiveNumber(value);
    if (key === 'height') return positiveNumber(value);
    if (key === 'resize') return value === 'true' || value === 'false' || value === 'both';
    return typeof value === typeof EDITOR_SETTING_DEFAULTS[key];
}

export function resolveEditorSettings(context: SettingsContext): EditorSettings {
    const handed = isRecord(context.moduleSettings) ? context.moduleSettings : {};
    const own = handed.moduleId === EDITOR_MODULE_ID && isRecord(handed.values) ? handed.values : {};
    const embedding = isRecord(context.config) ? context.config : {};
    const out = { ...EDITOR_SETTING_DEFAULTS } as Record<keyof EditorSettings, unknown>;
    for (const key of Object.keys(EDITOR_SETTING_DEFAULTS) as Array<keyof EditorSettings>) {
        for (const source of [own, embedding]) {
            if (usable(key, source[key])) out[key] = source[key];
        }
    }
    if (out.width !== 'auto') out.width = Number(out.width);
    out.height = Number(out.height);
    return out as unknown as EditorSettings;
}

/** The TinyMCE options the settings drive. `contentStyle` left empty takes the component's own default stylesheet. */
export function tinyMceOptions(s: EditorSettings, defaultContentStyle: string): Record<string, unknown> {
    return {
        ...(s.width !== 'auto' ? { width: s.width } : {}),
        height: s.height,
        resize: s.resize === 'false' ? false : s.resize === 'both' ? 'both' : true,
        menubar: s.menubar,
        statusbar: s.statusbar,
        toolbar_sticky: s.toolbarSticky,
        branding: s.branding,
        skin: s.skin,
        content_css: s.contentCss,
        content_style: s.contentStyle || defaultContentStyle,
        plugins: s.plugins,
        toolbar: s.toolbar,
        toolbar_mode: s.toolbarMode,
        browser_spellcheck: s.browserSpellcheck,
        paste_as_text: s.pasteAsText,
        paste_data_images: s.pasteDataImages,
        automatic_uploads: s.automaticUploads,
    };
}
