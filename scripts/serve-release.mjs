import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { activeSha, chubBin, chubEnvironment } from './release-paths.mjs';

try {
  const env = chubEnvironment(activeSha());
  accessSync(join(env.CHUB_DIR, 'config.yaml'), constants.R_OK);
  const child = spawn(process.execPath, [join(chubBin, 'chub-mcp')], { env, stdio: 'inherit' });
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
  }
} catch (error) {
  console.error(`Cannot serve release: ${error.message}`);
  process.exitCode = 1;
}
