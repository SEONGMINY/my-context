// Test-only preload: make Pi's temporary write fail only after Codex was written.
// Patches Node's builtin fs binding before the production CLI module is evaluated.
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const { sep } = require('node:path');
const write = fs.writeFileSync;
let wroteFirstTarget = false;
fs.writeFileSync = function(file, ...args) {
  const path = String(file);
  if (wroteFirstTarget && path.includes(sep + '.pi' + sep + 'agent' + sep + '.my-context-')) {
    const error = new Error('Injected second-target write failure');
    error.code = 'EIO';
    throw error;
  }
  const result = write.call(this, file, ...args);
  if (path.includes(sep + '.codex' + sep + '.my-context-')) wroteFirstTarget = true;
  return result;
};
syncBuiltinESMExports();
