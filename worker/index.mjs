import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { search } from '@aisuite/chub/src/lib/bm25.js';
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
  full: z.boolean().optional(),
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
    matching = [...ids].map((id) => entries.get(id)).filter(Boolean);
  }
  const requestedTags = tags?.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean) || [];
  const requestedLanguage = lang ? normalizeLanguage(lang) : undefined;
  return matching.filter((entry) =>
    requestedTags.every((tag) => entry.tags.some((value) => value.toLowerCase() === tag)) &&
    (!requestedLanguage || entry.languages?.some(({ language }) => language === requestedLanguage)));
}

function getAsset({ id, lang, version, file, full }) {
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
    instructions: 'Use only when the user requests their personal principles or workflows. Apply retrieved assets in the current project and respect its rules. Fetch attachments as needed.',
  });
  const annotations = { readOnlyHint: true };
  server.registerTool('chub_search', {
    description: 'Search published personal principles and workflows. Try matching English keywords when Korean yields no results.',
    inputSchema: { query: z.string().max(512).optional(), tags, lang: language, limit: z.number().int().min(1).max(100).optional() },
    annotations,
  }, ({ limit = 20, ...filters }) => {
    const matching = matchingEntries(filters);
    return textResult({ results: matching.slice(0, limit).map(summary), total: matching.length });
  });
  server.registerTool('chub_get', {
    description: 'Read a published principle, workflow, template, or script source by entry ID and optional file name.',
    inputSchema: getInput,
    annotations,
  }, getAsset);
  server.registerTool('chub_list', {
    description: 'List published personal principles and workflows.',
    inputSchema: { tags, lang: language, limit: z.number().int().min(1).max(500).optional() },
    annotations,
  }, ({ limit = 50, ...filters }) => {
    const matching = matchingEntries(filters);
    const listed = matching.slice(0, limit).map(summary);
    return textResult({ entries: listed, total: matching.length, showing: listed.length });
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
