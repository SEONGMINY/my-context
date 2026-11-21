import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Discover maintained Markdown sources instead of hardcoding a short entry-doc list.
export function listMarkdownDocuments(base = root) {
  function walk(directory) {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    });
  }
  return [
    ...['README.md', 'AGENTS.md'].map((name) => resolve(base, name)).filter(existsSync),
    ...['docs', 'policies', 'skills', 'content', 'test'].flatMap((name) => walk(resolve(base, name))),
  ];
}

const defaultDocuments = listMarkdownDocuments();

// Check local links in maintained Markdown docs, without fetching remote URLs.
function withoutFences(source) {
  let fence = null;
  return source.split('\n').map((line) => {
    const marker = line.match(/^\s*((?:\x60){3}|~{3})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (fence === marker[1]) fence = null;
      return '';
    }
    return fence ? '' : line;
  }).join('\n');
}

function headingIds(source) {
  const ids = new Set();
  const used = new Map();
  for (const line of withoutFences(source).split('\n')) {
    const match = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = match[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/[*_~\x60]/g, '')
      .trim().toLowerCase();
    const base = text.replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').replace(/ /g, '-');
    if (!base) continue;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    ids.add(count ? base + '-' + count : base);
  }
  return ids;
}

export function checkMarkdownLinks(documents = defaultDocuments) {
  const errors = [];
  for (const file of documents) {
    const absolute = resolve(file);
    if (!existsSync(absolute)) {
      errors.push(absolute + ': missing source document');
      continue;
    }
    const source = withoutFences(readFileSync(absolute, 'utf8'));
    for (const match of source.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
      const destination = match[1].trim().split(/\s+"/)[0];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(destination)) continue;
      const [rawPath, rawFragment] = destination.split('#');
      let path;
      let fragment;
      try {
        path = decodeURIComponent(rawPath);
        fragment = rawFragment === undefined ? undefined : decodeURIComponent(rawFragment).toLowerCase();
      } catch {
        errors.push(absolute + ': invalid URL encoding: ' + destination);
        continue;
      }
      const target = rawPath ? resolve(dirname(absolute), path) : absolute;
      if (!existsSync(target)) {
        errors.push(absolute + ': missing file: ' + destination);
        continue;
      }
      if (fragment && target.endsWith('.md') && !headingIds(readFileSync(target, 'utf8')).has(fragment)) {
        errors.push(absolute + ': missing heading: ' + destination);
      }
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkMarkdownLinks();
  if (failures.length) {
    for (const error of failures) console.error(error);
    process.exitCode = 1;
  } else {
    console.log('Verified local Markdown links and anchors in ' + defaultDocuments.length + ' maintained documents');
  }
}
