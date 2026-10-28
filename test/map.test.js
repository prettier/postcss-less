import { readFileSync } from 'node:fs';

import { join } from 'node:path';

import test from 'ava';
import postcss from 'postcss';

import syntax from '../lib/index.js';

const { parser } = syntax;
const __dirname = import.meta.dirname;

// silence the rediculously verbose "You did not set any plugins, parser, or
// stringifier" warnings in PostCSS.
console.warn = () => {}; // eslint-disable-line no-console

test('should parse LESS integration syntax and generate a source map', async (t) => {
  const less = readFileSync(
    join(__dirname, './integration/ext.cx.dashboard.less'),
    'utf-8'
  );
  const result = await postcss().process(less, {
    map: { annotation: false, inline: false, sourcesContent: true },
    parser,
    syntax
  });

  t.truthy(result);
  t.is(result.css, less);
  t.is(result.content, less);
  t.truthy(result.map);
});

test('should parse LESS inline comment syntax and generate a source map', async (t) => {
  const less = `
  a {
    //background-color: red;
  }
  `;
  const result = await postcss().process(less, {
    map: { annotation: false, inline: false, sourcesContent: true },
    parser,
    syntax
  });

  t.truthy(result);
  t.is(result.css, less);
  t.is(result.content, less);
  t.truthy(result.map);
});
