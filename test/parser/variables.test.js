import test from 'ava';
import AtRule from 'postcss/lib/at-rule';

import { parse, nodeToString } from '../../lib/index.js';

test('numeric', (t) => {
  const less = '@var: 1;';
  const root = parse(less);
  const { first } = root;

  t.true(first instanceof AtRule);
  t.is(first.name, 'var');
  t.is(first.value, '1');
  t.is(nodeToString(root), less);
});

test('@pagexxx like variable but not @page selector', (t) => {
  let less = '@pageWidth: "test";';
  let root = parse(less);
  let { first } = root;

  t.is(first.name, 'pageWidth');
  t.is(first.value, '"test"');
  t.is(nodeToString(root), less);

  less = '@page-width: "test";';
  root = parse(less);
  ({ first } = root);

  t.is(first.name, 'page-width');
  t.is(first.value, '"test"');
  t.is(nodeToString(root), less);
});

test('string values', (t) => {
  const less = '@var: "test";';
  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'var');
  t.is(first.value, '"test"');
  t.is(nodeToString(root), less);
});

test('mixed variables', (t) => {
  const propValue = '(   \n( ((@line-height))) * (@lines-to-show) )em';
  const less = `h1 { max-height: ${propValue}; }`;
  const root = parse(less);
  const { first } = root;

  t.is(first.selector, 'h1');
  t.is(first.first.prop, 'max-height');
  t.is(first.first.value, propValue);
  t.is(nodeToString(root), less);
});

test('color (hash) variables', (t) => {
  const less = '@var: #fff;';
  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'var');
  t.is(first.value, '#fff');
  t.is(nodeToString(root), less);
});

test('multiline position (#108)', (t) => {
  const less = `@var: '
foo
bar
';
`;
  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'var');
  t.is(first.value, `'\nfoo\nbar\n'`);
  t.is(first.source.end.line, 4);
  t.is(nodeToString(root), less);
});
