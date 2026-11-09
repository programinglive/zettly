/**
 * Loads the tag-axis helpers out of the real page source.
 *
 * WHY NOT A COPY
 * --------------
 * The page is JSX, so node:test cannot import it directly. Copying the two
 * functions into a test helper would make the test pass even after the page
 * changed, which is worse than no test. Instead the two exported functions are
 * lifted out of the page source and evaluated as plain JavaScript. If the page
 * renames or removes them, this throws and the suite fails.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(here, '..', 'resources', 'js', 'Pages', 'Todos', 'Index.jsx');
const source = readFileSync(pagePath, 'utf8');

/** Extracts one named function declaration from the source, brace-balanced. */
function extractFunction(name) {
  const start = source.indexOf(`export function ${name}(`);
  if (start < 0) throw new Error(`export function ${name} is missing from the todo page`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in export function ${name}`);
}

/** The module-level constants the extracted functions close over. */
function extractConst(name) {
  const match = new RegExp(`const ${name} = [^;]+;`).exec(source);
  if (!match) throw new Error(`const ${name} is missing from the todo page`);
  return match[0];
}

const code = [
  extractConst('AXIS_TITLES'),
  extractConst('AXIS_ORDER'),
  extractFunction('splitTagName').replace('export function', 'function'),
  extractFunction('groupTagsByAxis').replace('export function', 'function'),
  'return { splitTagName, groupTagsByAxis };',
].join('\n');

// eslint-disable-next-line no-new-func
const api = new Function(code)();

export const { splitTagName, groupTagsByAxis } = api;
