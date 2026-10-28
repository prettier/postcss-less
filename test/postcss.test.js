import test from 'ava';
import postcss from 'postcss';
import CssSyntaxError from 'postcss/lib/css-syntax-error';

import syntax from '../lib/index.js';

const { parser } = syntax;

// silence the rediculously verbose "You did not set any plugins, parser, or
// stringifier" warnings in PostCSS.
console.warn = () => {};

test('should process LESS syntax', async (t) => {
  const less = 'a { b {} }';
  const result = await postcss().process(less, { parser, syntax });

  t.truthy(result);
  t.is(result.css, less);
  t.is(result.content, less);
});

test('should not parse invalid LESS (#64)', async (t) => {
  const less = '.@{]';

  try {
    await postcss().process(less, { syntax });
  } catch (e) {
    t.true(e instanceof CssSyntaxError);
  }
});

test('should create its own Root node stringifier (#82)', async (t) => {
  const less = '@const "foo.less"';
  const result = await postcss().process(less, { syntax });

  t.is(result.root.toString(), less);
});
