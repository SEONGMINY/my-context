import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'my-context-smoke-'));
const repo = join(scratch, 'repo');
const releases = join(scratch, 'releases');
const workflowId = 'workflows/sample-workflow';
const principleId = 'personal/sample-principle';
const templatePath = 'templates/output.md';
const scriptPath = 'scripts/format.sh';
const token = randomBytes(32).toString('hex');
const tokenFile = join(scratch, 'token');
const env = { ...process.env, MY_CONTEXT_RELEASES_DIR: releases, MY_CONTEXT_MCP_TOKEN_FILE: tokenFile, MY_CONTEXT_MCP_HOST: '127.0.0.1' };
delete env.MY_CONTEXT_MCP_TOKEN;

let server;
let serverOutput = '';
let client;

function git(...args) {
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=Smoke Test', '-c', 'user.email=smoke@example.invalid', ...args], {
    cwd: repo,
    encoding: 'utf8',
  }).trim();
}

function commit(message) {
  git('add', '--', 'content', 'skills', 'publish-skills.json');
  git('commit', '-qm', message);
  return git('rev-parse', 'HEAD');
}

function publish(revision) {
  return execFileSync(process.execPath, ['scripts/publish-release.mjs', revision], {
    cwd: repo,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function fixtureFile(relativePath, content) {
  const file = join(repo, relativePath);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

function skill(name, marker) {
  return `---\nname: ${name}\ndescription: ${marker}\nmetadata:\n  source: community\n---\n# ${marker}\n`;
}

async function writeWorkflow(marker) {
  await Promise.all([
    fixtureFile('skills/sample-workflow/SKILL.md', skill('sample-workflow', marker)),
    fixtureFile(`skills/sample-workflow/${templatePath}`, `# Template ${marker}\n`),
  ]);
}

async function freePort() {
  const probe = createServer();
  probe.listen(0, env.MY_CONTEXT_MCP_HOST);
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function awaitHealth(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null || server.signalCode !== null) break;
    const response = await fetch(url, { signal: AbortSignal.timeout(500) }).catch(() => undefined);
    if (response?.ok) return;
    await delay(100);
  }
  throw new Error('MCP gateway did not become ready');
}

async function call(name, args) {
  return client.callTool({ name, arguments: args }, undefined, { timeout: 5_000 });
}

async function get(id, file) {
  const result = await call('chub_get', { id, ...(file ? { file } : {}) });
  assert.equal(Boolean(result.isError), false, result.content[0].text);
  return result.content[0].text;
}

async function search(query) {
  const result = await call('chub_search', { query });
  assert.equal(Boolean(result.isError), false, result.content[0].text);
  return JSON.parse(result.content[0].text).results.map(({ id }) => id);
}

async function verifyWorkflow(marker) {
  assert.deepEqual(await search(marker), [workflowId]);
  assert.match(await get(workflowId), new RegExp(`# ${marker}`));
  assert.match(await get(workflowId, templatePath), new RegExp(`Template ${marker}`));
}

async function verifyActiveRevision(revision) {
  assert.equal(await readlink(join(releases, 'current')), revision);
  const config = await readFile(join(releases, '.config', revision, 'config.yaml'), 'utf8');
  assert.ok(config.includes(`path: ${JSON.stringify(join(releases, revision))}`));
}

async function verifyRejectedRevision(message, activeRevision) {
  const rejected = commit(message);
  assert.throws(() => publish(rejected), (error) => typeof error.status === 'number' && error.status !== 0);
  await assert.rejects(stat(join(releases, rejected)), { code: 'ENOENT' });
  await assert.rejects(stat(join(releases, '.config', rejected)), { code: 'ENOENT' });
  await verifyActiveRevision(activeRevision);
  await verifyWorkflow('secondsnapshot');
}

try {
  await mkdir(repo);
  await cp(join(root, 'scripts'), join(repo, 'scripts'), { recursive: true });
  await symlink(join(root, 'node_modules'), join(repo, 'node_modules'), 'dir');
  await writeFile(tokenFile, `${token}\n`, { mode: 0o600 });
  git('init', '-q', '--template=');
  await Promise.all([
    fixtureFile('publish-skills.json', '["sample-workflow", "manage-dev-knowledge"]\n'),
    fixtureFile('content/personal/sample-principle/SKILL.md', skill('sample-principle', 'sampleprinciple')),
    fixtureFile('skills/manage-dev-knowledge/SKILL.md', skill('manage-dev-knowledge', 'adminpublished')),
    fixtureFile(`skills/sample-workflow/${scriptPath}`, '#!/bin/sh\n# Synthetic attachment\n'),
    writeWorkflow('firstsnapshot'),
  ]);
  const first = commit('Publish first fixture');
  await writeWorkflow('uncommittedsnapshot');
  assert.equal(publish(first), first);
  await verifyActiveRevision(first);

  env.MY_CONTEXT_MCP_PORT = String(await freePort());
  const baseUrl = `http://${env.MY_CONTEXT_MCP_HOST}:${env.MY_CONTEXT_MCP_PORT}`;
  const url = new URL('/mcp', baseUrl);
  server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => { serverOutput = (serverOutput + chunk).slice(-8_000); });
  }
  await awaitHealth(new URL('/health', baseUrl));
  const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke-probe', version: '1' } } };
  for (const authorization of [undefined, 'Bearer invalid-smoke-token']) {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(authorization ? { Authorization: authorization } : {}) };
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(initialize), signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 401);
  }

  client = new Client({ name: 'my-context-smoke', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }), { timeout: 5_000 });
  const { tools } = await client.listTools(undefined, { timeout: 5_000 });
  assert.deepEqual(tools.map(({ name }) => name).sort(), ['chub_get', 'chub_list', 'chub_search']);
  for (const name of ['chub_annotate', 'chub_feedback']) {
    await assert.rejects(call(name, { id: workflowId }), { code: -32602 });
  }
  assert.deepEqual(await search('sampleprinciple'), [principleId]);
  assert.deepEqual(await search('adminpublished'), ['workflows/manage-dev-knowledge']);
  assert.deepEqual(await search('uncommittedsnapshot'), []);
  const listing = await call('chub_list', {});
  assert.deepEqual(JSON.parse(listing.content[0].text).entries.map(({ id }) => id).sort(), [principleId, workflowId, 'workflows/manage-dev-knowledge'].sort());
  assert.match(await get('workflows/manage-dev-knowledge'), /adminpublished/);
  assert.equal((await call('chub_get', { id: workflowId, file: '../SKILL.md' })).isError, true);
  assert.match(await get(workflowId, scriptPath), /Synthetic attachment/);
  await verifyWorkflow('firstsnapshot');

  await writeWorkflow('secondsnapshot');
  const second = commit('Publish updated fixture');
  assert.equal(publish(second), second);
  await verifyActiveRevision(second);
  assert.match(await readFile(join(releases, first, 'workflows', 'sample-workflow', 'SKILL.md'), 'utf8'), /# firstsnapshot/);
  await verifyWorkflow('secondsnapshot');
  assert.deepEqual(await search('firstsnapshot'), []);

  await fixtureFile('publish-skills.json', '["sample-workflow", "manage-dev-knowledge", "missing-workflow"]\n');
  await verifyRejectedRevision('Reject missing published skill', second);
  await fixtureFile('publish-skills.json', '["sample-workflow", "manage-dev-knowledge"]\n');
  await fixtureFile('skills/sample-workflow/SKILL.md', '# Malformed fixture without a name\n');
  await verifyRejectedRevision('Reject failing Context Hub build', second);

  assert.equal(publish(first), first);
  await verifyActiveRevision(first);
  await verifyWorkflow('firstsnapshot');
  assert.deepEqual(await search('secondsnapshot'), []);
  console.log('Verified release isolation, authenticated MCP, live updates, last-good fallback, and rollback.');
} catch (error) {
  if (serverOutput) process.stderr.write(serverOutput);
  throw error;
} finally {
  await client?.close();
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
  await rm(scratch, { recursive: true, force: true });
}
