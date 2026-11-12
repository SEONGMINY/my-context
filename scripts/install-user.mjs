import { existsSync, readFileSync, mkdirSync, appendFileSync, symlinkSync, realpathSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configDir = process.env.CODEX_HOME || join(homedir(), '.codex');
const configPath = join(configDir, 'config.toml');
const launcher = join(root, 'scripts/context-hub-mcp.sh');
const skillSource = join(root, 'skills/manage-dev-knowledge');
const skillTarget = join(homedir(), '.agents/skills/manage-dev-knowledge');
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--check')) throw new Error('Usage: npm run install:user -- [--check]');
if (!existsSync(join(root, '.local/node-path'))) throw new Error('Run npm run setup first.');
const config = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
const header = '[mcp_servers.personal-knowledge]';
const expected = `${header}\ncommand = "/bin/sh"\nargs = [${JSON.stringify(launcher)}]\nenabled_tools = ["chub_search", "chub_get", "chub_list"]\n`;
// Preflight both targets before changing either. A skill-name conflict must
// not leave an unrelated partial MCP installation behind.
let skillPresent = false;
try { lstatSync(skillTarget); skillPresent = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (skillPresent && realpathSync(skillTarget) !== realpathSync(skillSource)) {
  throw new Error('Existing skill preserved; target differs: ' + skillTarget);
}
const serverPresent = /^\s*\[\s*mcp_servers\.(?:personal-knowledge|"personal-knowledge"|'personal-knowledge')\s*\]/m.test(config);
if (serverPresent && !config.includes(expected)) {
  throw new Error('Existing personal-knowledge configuration differs; review it manually.');
}
if (args.includes('--check')) {
  console.log(JSON.stringify({
    mcp: { path: configPath, action: serverPresent ? 'keep' : 'add' },
    skill: { path: skillTarget, action: skillPresent ? 'keep' : 'link' }
  }, null, 2));
  process.exit(0);
}
// Never replace an existing server or unrelated user configuration.
if (serverPresent) {
  console.log('MCP configuration already matches.');
} else {
  mkdirSync(configDir, { recursive: true });
  appendFileSync(configPath, '\n' + expected, { mode: 0o600 });
  console.log('Added MCP configuration: ' + configPath);
}
mkdirSync(dirname(skillTarget), { recursive: true });
if (skillPresent) {
  console.log('Skill link already matches.');
} else {
  symlinkSync(skillSource, skillTarget, 'dir');
  console.log('Installed user skill: ' + skillTarget);
}
