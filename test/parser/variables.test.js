import test from 'ava';
import { outdent } from 'outdent';
import AtRule from 'postcss/lib/at-rule';

import { parse } from '../../lib/index.js';
import { nodeToString } from '../helpers/node-to-string.js';

test('parses variables with whitespace and comments around the colon', (t) => {
  for (const [less, afterName, value] of [
    ['@foo:red;', ':', 'red'],
    ['@foo :red;', ' :', 'red'],
    ['@foo : red;', ' : ', 'red'],
    ['@foo/* before */:red;', '/* before */:', 'red'],
    [
      '@foo /* first */ /* second */ : /* after */ red;',
      ' /* first */ /* second */ : ',
      '/* after */ red',
    ],
    ['@foo // comment\n: red;', ' // comment\n: ', 'red'],
    ['@foo // first\n // second\n: red;', ' // first\n // second\n: ', 'red'],
    ['@foo/* before */: // after\nred;', '/* before */: ', '// after\nred'],
    ["@foo // it's; { not closed\n: red;", " // it's; { not closed\n: ", 'red'],
    ['@foo:/* after */red;', ':', '/* after */red'],
  ]) {
    const root = parse(less);
    const node = root.first;

    t.is(node.type, 'atrule');
    t.is(node.name, 'foo');
    t.true(node.variable);
    t.is(node.value, value);
    t.is(node.params, value);
    t.is(node.raws.afterName, afterName);
    t.is(nodeToString(root), less);

    node.value = 'changed';
    t.is(nodeToString(root), `@foo${afterName}changed;`);
  }
});

test('parses nested and unterminated variable declarations', (t) => {
  const less = '.rule {\n  @foo /* note */ :red;\n  color: @foo;\n}';
  const root = parse(less);
  const variable = root.first.first;

  t.true(variable.variable);
  t.is(variable.name, 'foo');
  t.is(variable.value, 'red');
  t.is(variable.source.start.line, 2);
  t.is(variable.source.start.column, 3);
  t.is(variable.source.end.line, 2);
  t.is(variable.source.end.column, 23);
  t.is(root.first.last.value, '@foo');
  t.is(nodeToString(root), less);

  const withoutSemicolon = parse('@foo :red');
  t.is(withoutSemicolon.first.value, 'red');
  t.is(nodeToString(withoutSemicolon), '@foo :red');
});

test('preserves at-rule inline comments in params and raws', (t) => {
  for (const [less, params, between] of [
    ['@media // comment\n screen {}', '// comment\n screen', ' '],
    ['@media screen // comment\n{}', 'screen // comment', '\n'],
    ['@media screen, // comment\n print {}', 'screen, // comment\n print', ' '],
  ]) {
    const root = parse(less);
    const node = root.first;

    t.is(node.params, params);
    t.is(node.raws.afterName, ' ');
    t.is(node.raws.between, between);
    t.is(node.raws.params, undefined);
    t.is(nodeToString(root), less);
  }
});

test('numeric', (t) => {
  const less = '@var: 1;';
  const root = parse(less);
  const { first } = root;

  t.true(first instanceof AtRule);
  t.is(first.name, 'var');
  t.is(first.value, '1');
  t.is(nodeToString(root), less);
});

test('@pageXxx like variable but not @page selector', (t) => {
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

test('distinguishes page variables from page pseudo-selectors', (t) => {
  for (const less of ['@page:red;', '@page : red;']) {
    const root = parse(less);
    t.true(root.first.variable);
    t.is(root.first.name, 'page');
    t.is(root.first.value, 'red');
    t.is(nodeToString(root), less);
  }

  for (const [less, name, params] of [
    ['@page :left {}', 'page', ':left'],
    ['@page:left {}', 'page:left', ''],
    ['@page :first:left /* comment */ {}', 'page', ':first:left'],
    ['@page :custom {}', 'page', ':custom'],
  ]) {
    const root = parse(less);
    t.is(root.first.variable, undefined);
    t.is(root.first.name, name);
    t.is(root.first.params, params);
    t.is(nodeToString(root), less);
  }
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

test('preserves inline comments in variable values and respects edits', (t) => {
  for (const less of [
    '@list: a, // comment\n b;',
    '@list:\ta, // comment\n b;',
    '@list: a /* comment */ b;',
  ]) {
    const root = parse(less);
    const value = less.match(/:\s*(.*);/s)[1];

    t.is(root.first.value, value);
    t.is(root.first.params, value);
    t.is(nodeToString(root), less);

    root.first.value = 'changed';
    t.is(nodeToString(root), less.replace(value, 'changed'));
  }
});

test('preserves leading comments in variable values', (t) => {
  const value = outdent`
    // Fruit
    apple,
    banana,
    cherry,
    // Vegetables
    carrot,
    potato
  `;
  const less = `@items: ${value};`;
  const root = parse(less);

  t.is(root.first.value, value);
  t.is(root.first.params, value);
  t.is(nodeToString(root), less);

  root.first.value = 'changed';
  t.is(nodeToString(root), '@items: changed;');
});

test('preserves leading block and comment-only variable values', (t) => {
  for (const [less, value] of [
    [
      '@item: /* first */ // second\n  apple;',
      '/* first */ // second\n  apple',
    ],
    ['@item: /* only */ ;', '/* only */ '],
    ['@item: // only\n;', '// only\n'],
  ]) {
    const root = parse(less);
    t.is(root.first.value, value);
    t.is(root.first.params, value);
    t.is(nodeToString(root), less);
  }
});
