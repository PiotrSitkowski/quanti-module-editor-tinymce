/**
 * The editor's one read of its settings. The defaults repeat the declaration so the bundle does not carry the
 * manifest — this test holds them equal; a value the editor cannot use (AutoForm saves `0` and `''` for an empty
 * field) leaves the default to speak.
 */
import { describe, it, expect } from 'vitest';
import { configSchema } from '../../definition';
import { EDITOR_SETTING_DEFAULTS, resolveEditorSettings } from './editorSettings';

const own = (values: Record<string, unknown>) => ({ moduleSettings: { moduleId: 'editor-wysywig-mce', values } });

describe('resolveEditorSettings', () => {
    it('the defaults are the declared ones', () => {
        expect(EDITOR_SETTING_DEFAULTS).toEqual(configSchema.parse({}));
    });

    it('an empty number or text saved by the form is not an answer', () => {
        const s = resolveEditorSettings(own({ height: 0, width: '', skin: null }));
        expect(s.height).toBe(500);
        expect(s.width).toBe('auto');
        expect(s.skin).toBe('oxide');
    });

    it('numbers saved as text are numbers', () => {
        const s = resolveEditorSettings(own({ height: '640', width: '800' }));
        expect(s.height).toBe(640);
        expect(s.width).toBe(800);
    });

    it('a value of the wrong shape is not an answer either', () => {
        expect(resolveEditorSettings(own({ menubar: 'yes', resize: 'sideways' }))).toMatchObject({ menubar: false, resize: 'true' });
    });

    it('another module\'s settings are not the editor\'s', () => {
        expect(resolveEditorSettings({ moduleSettings: { moduleId: 'posts', values: { height: 888 } } }).height).toBe(500);
    });
});
