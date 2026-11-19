import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const token = process.env.MY_CONTEXT_MCP_TOKEN?.trim();
const tokenFileOption = process.env.MY_CONTEXT_MCP_TOKEN_FILE?.trim();
const tokenFile = tokenFileOption ? resolve(tokenFileOption) : undefined;
const host = process.env.MY_CONTEXT_MCP_HOST || '127.0.0.1';
const port = process.env.MY_CONTEXT_MCP_PORT || '8090';

if (Boolean(token) === Boolean(tokenFile)) {
  throw new Error('Set exactly one of MY_CONTEXT_MCP_TOKEN or MY_CONTEXT_MCP_TOKEN_FILE.');
}
if (token && /\s/.test(token)) {
  throw new Error('MY_CONTEXT_MCP_TOKEN must be a single token without whitespace.');
}
if (tokenFile && !readFileSync(tokenFile, 'utf8').trim()) {
  throw new Error('MY_CONTEXT_MCP_TOKEN_FILE must contain at least one token.');
}
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('MY_CONTEXT_MCP_PORT must be a port number from 1 to 65535.');
}

const env = { ...process.env };
delete env.MY_CONTEXT_MCP_TOKEN;
delete env.MY_CONTEXT_MCP_TOKEN_FILE;
// Keep the gateway's accepted keys explicit, even if the caller uses it separately.
delete env.SUPERGATEWAY_API_KEY;
delete env.SUPERGATEWAY_API_KEY_FILE;
if (tokenFile) {
  env.SUPERGATEWAY_API_KEY_FILE = tokenFile;
} else {
  env.SUPERGATEWAY_API_KEY = token;
}

const gateway = spawn(process.execPath, [
  join(root, 'node_modules', 'supergateway', 'dist', 'index.js'),
  '--stdio', 'node scripts/serve-release.mjs',
  // Stateless requests launch a fresh upstream against the active release.
  '--outputTransport', 'streamableHttp',
  '--host', host,
  '--port', port,
  '--healthEndpoint', '/health',
  '--healthCheck', 'server',
  '--tools', 'chub_search',
  '--tools', 'chub_get',
  '--tools', 'chub_list',
], { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit'] });

const stop = (signal) => gateway.kill(signal);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
gateway.once('error', (error) => {
  console.error(`Could not start the MCP gateway: ${error.message}`);
  process.exitCode = 1;
});
gateway.once('close', (code) => {
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
  process.exitCode = code ?? 1;
});
