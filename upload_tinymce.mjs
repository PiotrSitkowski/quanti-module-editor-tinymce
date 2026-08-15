import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const SRC_DIR = './node_modules/tinymce';
const DEST_PREFIX = 'quanti-modules-cdn/libs/tinymce';

/**
 * Language packs, which the `tinymce` package does NOT ship.
 *
 * TinyMCE loads a translation from `<base_url>/langs/<language>.js` and falls back to English in
 * silence when that file is missing — no error in the console, no hint in the editor, just an
 * English toolbar over Polish content. Measured on production 2026-08-15: the module asked for
 * `language: 'pl'` from the very first release, `tinymce.min.js` answered 200 and
 * `langs/pl.js` answered 404 the whole time.
 *
 * Only the locales this module actually maps (`LANG_MAP` in PostEditorSlot) are published;
 * `en_US` needs no file because it is built into the editor. Uploading all ~70 translations
 * would put megabytes on the CDN that nothing ever requests.
 */
const I18N_DIR = './node_modules/tinymce-i18n/langs7';
const LANGS = ['pl'];

function getContentType(filePath) {
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.woff')) return 'font/woff';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

async function walk(dir, fileList = []) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const stat = await fs.promises.stat(path.join(dir, file));
    if (stat.isDirectory()) {
      await walk(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

/** Language packs as (source, destination) pairs — they live outside SRC_DIR. */
function languageFiles() {
  return LANGS.map(lang => {
    const file = path.join(I18N_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) {
      // Loud, because the failure it guards against is silent: a missing pack costs the editor
      // its language and says nothing at all.
      throw new Error(
        `Language pack '${lang}' not found at ${file}. Run: npm install --save-dev tinymce-i18n`,
      );
    }
    return { file, dest: `${DEST_PREFIX}/langs/${lang}.js` };
  });
}

async function run() {
  const files = await walk(SRC_DIR);
  // Filter unwanted files
  const toUpload = files.filter(f =>
    !f.endsWith('.ts') &&
    !f.endsWith('.md') &&
    !f.endsWith('package.json') &&
    !f.endsWith('bower.json') &&
    !f.endsWith('composer.json')
  ).map(f => ({ file: f, dest: `${DEST_PREFIX}/${path.relative(SRC_DIR, f)}` }))
   .concat(languageFiles());

  console.log(`Uploading ${toUpload.length} files...`);
  
  const concurrency = 10;
  let active = 0;
  let index = 0;
  let success = 0;
  let failed = 0;

  await new Promise(resolve => {
    function processNext() {
      if (index >= toUpload.length) {
        if (active === 0) resolve();
        return;
      }
      active++;
      const { file, dest: destPath } = toUpload[index++];
      const relPath = path.relative(SRC_DIR, file);
      const cType = getContentType(file);

      const cmd = `wrangler r2 object put "${destPath}" --file="${file}" --content-type="${cType}" --remote`;

      execAsync(cmd)
        .then(() => {
          success++;
          console.log(`[${success}/${toUpload.length}] Uploaded ${relPath}`);
        })
        .catch(err => {
          failed++;
          console.error(`Failed ${relPath}: ${err.message}`);
        })
        .finally(() => {
          active--;
          processNext();
        });
    }

    for (let i = 0; i < concurrency; i++) processNext();
  });
  
  console.log(`Done. Success: ${success}, Failed: ${failed}`);
}

run();
