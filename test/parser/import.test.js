import test from 'ava';
import AtRule from 'postcss/lib/at-rule';

import syntax from '../../lib/index.js';

const { parse, nodeToString } = syntax;

test('@at-rules != @imports', async (t) => {
  const less = '@const "foo.less";';
  const root = parse(less);
  const {
    first,
    source: { input }
  } = root;

  t.truthy(root);
  t.is(input.css, less);
  t.true(first instanceof AtRule);
  t.falsy(first.import);
  t.is(nodeToString(root), less);
});

test('@imports', async (t) => {
  const less = '@import "foo.less";';
  const root = parse(less);
  const {
    first,
    source: { input }
  } = root;

  t.truthy(root);
  t.is(input.css, less);
  t.true(first.import);
  t.is(first.filename, '"foo.less"');
  t.is(nodeToString(root), less);
});

test('import options', async (t) => {
  const less = '@import (inline) "foo.less";';
  const root = parse(less);

  t.is(root.first.options, '(inline)');
  t.is(nodeToString(root), less);
});

test('multiple import options', async (t) => {
  const less = '@import (inline, once, optional) "foo.less";';
  const root = parse(less);

  t.is(root.first.options, '(inline, once, optional)');
  t.is(nodeToString(root), less);
});

test('url("filename")', async (t) => {
  const less = '@import url("foo.less");';
  const root = parse(less);

  t.is(root.first.filename, '"foo.less"');
  t.is(nodeToString(root), less);
});

test('url(filename)', async (t) => {
  const less = '@import url(foo.less);';
  const root = parse(less);

  t.is(root.first.filename, 'foo.less');
  t.is(nodeToString(root), less);
});

test('no spaces', async (t) => {
  const less = '@import"foo.less";';
  const root = parse(less);

  t.is(root.first.filename, '"foo.less"');
  t.is(nodeToString(root), less);
});

test('malformed filename (#88)', async (t) => {
  const less = '@import missing "missing" "not missing";';
  const root = parse(less);

  t.is(root.first.filename, 'missing "missing" "not missing"');
  t.is(nodeToString(root), less);
});

test('mmissing semicolon (#88)', async (t) => {
  const less = `
@import "../assets/font/league-gothic/league-gothic.css"

.ManagerPage {
  height: 100%;
}`;
  const root = parse(less);

  t.is(
    root.first.filename,
    '"../assets/font/league-gothic/league-gothic.css"\n\n.ManagerPage'
  );
  t.is(nodeToString(root), less);
});
