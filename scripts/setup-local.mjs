import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, '.local');
mkdirSync(join(local, 'chub'), { recursive: true });
writeFileSync(join(local, 'node-path'), process.execPath + '\n');
writeFileSync(join(local, 'chub/config.yaml'), [
  'sources:', '  - name: personal',
  `    path: ${JSON.stringify(join(root, '.generated/context-hub'))}`,
  'telemetry: false', 'feedback: false', 'help_url: null', ''
].join('\n'));
console.log('Configured local-only Context Hub at ' + root);
