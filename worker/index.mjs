import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { search } from '@aisuite/chub/src/lib/bm25.js';
import { searchKorean } from './korean-search.mjs';
import { normalizeLanguage } from '@aisuite/chub/src/lib/normalize.js';
import { z } from 'zod';
import release from '../.generated/worker/release.json' with { type: 'json' };
import { createAuthenticator } from './auth.mjs';

const entries = new Map(release.entries.map((entry) => [entry.id, entry]));
const authenticate = createAuthenticator();
const language = z.string().max(80).optional();
const tags = z.string().max(512).optional();
const getInput = {
  id: z.string().max(256).describe('Entry ID returned by search or list'),
  lang: language,
  version: z.string().max(80).optional(),
  file: z.string().max(512).optional().describe('Exact relative path to an attachment, such as templates/output.md'),
  revision: z.string().regex(/^[0-9a-f]{40}$/).optional().describe('Revision returned by search or list; rejects a different release instead of mixing assets.'),
  full: z.boolean().optional().describe('Defaults to false. Use only when all files are explicitly needed; for routine workflow use, first read the main SKILL.md (or DOC.md) without full, then fetch a specific attachment with file if required.'),
};

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] };
}

function errorResult(message, available) {
  return { ...textResult({ error: message, available }), isError: true };
}

function summary(entry) {
  const { id, name, description, tags, type, languages, files } = entry;
  return {
    id, name, description, tags, type,
    role: files?.some(([name]) => name === 'knowledge.md') && id.startsWith('personal/') ? 'knowledge' : type === 'skill' ? 'procedure' : 'reference',
    languages: languages?.map(({ language }) => language),
    files: files?.map(([name]) => name),
  };
}

function matchingEntries({ query, tags, lang }) {
  const term = query?.trim();
  let matching = release.entries;
  if (term) {
    const ids = new Set();
    if (entries.has(term)) ids.add(term);
    for (const { id } of search(term, release.searchIndex)) ids.add(id);
    if (/[가-힣]/.test(term)) for (const id of searchKorean(term, release.entries)) ids.add(id);
    matching = [...ids].map((id) => entries.get(id)).filter(Boolean);
  }
  const requestedTags = tags?.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean) || [];
  const requestedLanguage = lang ? normalizeLanguage(lang) : undefined;
  return matching.filter((entry) =>
    requestedTags.every((tag) => entry.tags.some((value) => value.toLowerCase() === tag)) &&
    (!requestedLanguage || entry.languages?.some(({ language }) => language === requestedLanguage)));
}

function getAsset({ id, lang, version, file, full, revision }) {
  if (revision && revision !== release.sha) return errorResult('Release changed; rediscover assets before continuing.', release.sha);
  const entry = entries.get(id);
  if (!entry) return errorResult(`Entry not found: ${id}`);

  let files = entry.files;
  if (entry.type === 'doc') {
    const requestedLanguage = lang ? normalizeLanguage(lang) : undefined;
    const selectedLanguage = lang
      ? entry.languages.find(({ language }) => language === requestedLanguage)
      : entry.languages.length === 1 ? entry.languages[0] : undefined;
    if (!selectedLanguage) return errorResult('Select a language.', entry.languages.map(({ language }) => language));
    const selectedVersion = selectedLanguage.versions.find((item) => item.version === (version || selectedLanguage.recommendedVersion));
    if (!selectedVersion) return errorResult('Version not found.', selectedLanguage.versions.map(({ version }) => version));
    files = selectedVersion.files;
  }

  if (full && !file) return textResult(files.map(([name, content]) => `# FILE: ${name}\n\n${content}`).join('\n\n---\n\n'));
  const selected = file || (entry.type === 'skill' ? 'SKILL.md' : 'DOC.md');
  const match = files.find(([name]) => name === selected);
  return match ? textResult(match[1]) : errorResult(`File not found: ${selected}`, files.map(([name]) => name));
}

function createServer() {
  const server = new McpServer({ name: 'my-context', version: release.sha }, {
    instructions: 'Read personal assets only on an explicit user request (including use my-context without naming an asset) or under an enabled opt-in read-only asset-usage policy in this agent environment. MCP access alone is not consent. Honor explicit exclusions and the scope of the installed policy. Search for the current decision using minimal non-sensitive keywords, compare candidate descriptions and roles, then read only relevant entries and needed attachments. Knowledge informs judgment; procedures guide authorized work without duplicating overlapping steps. Respect each asset’s own activation conditions, current user and project rules. Do not infer write, installation, deployment or additional personal-data access permission. Reuse valid context; search again only for a new information need, and stop when sufficient or no new relevant results. If unavailable, report the limitation.',
  });
  const annotations = { readOnlyHint: true };
  server.registerTool('chub_search', {
    description: 'Discover published personal principles and workflows for the current task, even when the user names only my-context. With explicit permission or applicable opt-in, search using focused non-sensitive intent keywords, compare candidate descriptions and roles; use a small limit for discovery. Try alternative English or Korean keywords if relevant candidates are missing. Do not call for unrelated work.',
    inputSchema: { query: z.string().max(512).optional().describe('Focused task or decision keywords; do not include source code, secrets, private prompts or customer data.'), tags, lang: language, limit: z.number().int().min(1).max(100).optional() },
    annotations,
  }, ({ limit = 20, ...filters }) => {
    const matching = matchingEntries(filters);
    return textResult({ revision: release.sha, results: matching.slice(0, limit).map(summary), total: matching.length });
  });
  server.registerTool('chub_get', {
    description: 'Read a published asset. Default: only SKILL.md or DOC.md, without attachments. For knowledge entries read knowledge.md when applying the principle; for workflows read only required attachments with file. Pass the discovery revision to avoid mixing releases. Reuse already loaded valid content. Use full:true only when every file is explicitly needed; it increases context size.',
    inputSchema: getInput,
    annotations,
  }, getAsset);
  server.registerTool('chub_list', {
    description: 'List published personal principles and workflows for inventory; prefer focused search for task discovery.',
    inputSchema: { tags, lang: language, limit: z.number().int().min(1).max(500).optional() },
    annotations,
  }, ({ limit = 50, ...filters }) => {
    const matching = matchingEntries(filters);
    const listed = matching.slice(0, limit).map(summary);
    return textResult({ revision: release.sha, entries: listed, total: matching.length, showing: listed.length });
  });
  return server;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/mcp') return new Response(null, { status: 404 });
    const origin = request.headers.get('origin');
    if (origin !== null && origin !== url.origin) return new Response(null, { status: 403 });

    const denied = await authenticate(request, env);
    if (denied) return denied;
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });

    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    const server = createServer();
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close();
    }
  },
};
