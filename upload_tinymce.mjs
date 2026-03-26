import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const SRC_DIR = './node_modules/tinymce';
const DEST_PREFIX = 'quanti-modules-cdn/libs/tinymce';

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

async function run() {
  const files = await walk(SRC_DIR);
  // Filter unwanted files
  const toUpload = files.filter(f => 
    !f.endsWith('.ts') && 
    !f.endsWith('.md') && 
    !f.endsWith('package.json') && 
    !f.endsWith('bower.json') && 
    !f.endsWith('composer.json')
  );
  
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
      const file = toUpload[index++];
      const relPath = path.relative(SRC_DIR, file);
      const destPath = `${DEST_PREFIX}/${relPath}`;
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
