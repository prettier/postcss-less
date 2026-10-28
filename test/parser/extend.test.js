import test from 'ava';

import syntax from '../../lib/index.js';

const { parse, nodeToString } = syntax;

test('inline :extend()', (t) => {
  const less = '.a:extend(.b) {color: red;}';
  const root = parse(less);
  const { first } = root;

  t.is(first.selector, '.a:extend(.b)');
  t.truthy(first.extend);
  t.is(nodeToString(root), less);
});

test('inline :extend() with multiple parameters', (t) => {
  const less = '.e:extend(.f, .g) {}';
  const { first } = parse(less);

  t.is(first.selector, '.e:extend(.f, .g)');
  t.truthy(first.extend);
});

test('inline :extend() with nested selector in parameters', (t) => {
  const less = '.e:extend(.a .g, b span) {}';
  const { first } = parse(less);

  t.is(first.selector, '.e:extend(.a .g, b span)');
  t.truthy(first.extend);
});

test('parses nested &:extend()', (t) => {
  const less = '.a {\n      &:extend(.bucket tr);\n}';
  const { first } = parse(less);

  t.is(first.selector, '.a');
  t.is(first.first.prop, '&');
  t.is(first.first.value, 'extend(.bucket tr)');
  t.truthy(first.first.extend);
});

test('parses :extend() after selector', (t) => {
  const less = 'pre:hover:extend(div pre){}';
  const { first } = parse(less);

  t.is(first.selector, 'pre:hover:extend(div pre)');
  t.truthy(first.extend);
});

test('parses :extend() after selector. 2', (t) => {
  const less = 'pre:hover :extend(div pre){}';
  const { first } = parse(less);

  t.is(first.selector, 'pre:hover :extend(div pre)');
  t.truthy(first.extend);
});

test('parses multiple extends', (t) => {
  const less = 'pre:hover:extend(div pre):extend(.bucket tr) { }';
  const { first } = parse(less);

  t.is(first.selector, 'pre:hover:extend(div pre):extend(.bucket tr)');
  t.truthy(first.extend);
});

test('parses nth expression in extend', (t) => {
  const less =
    ':nth-child(1n+3) {color: blue;} .child:extend(:nth-child(n+3)) {}';
  const root = parse(less);
  const { first, last } = root;

  t.is(first.selector, ':nth-child(1n+3)');
  t.is(last.selector, '.child:extend(:nth-child(n+3))');
  t.truthy(last.extend);
});

test('"all"', (t) => {
  const less = '.replacement:extend(.test all) {}';
  const { first } = parse(less);

  t.is(first.selector, '.replacement:extend(.test all)');
  t.truthy(first.extend);
});

test('with interpolation', (t) => {
  const less =
    '.bucket {color: blue;}\n.some-class:extend(@{variable}) {}\n@variable: .bucket;';
  const root = parse(less);

  t.is(root.nodes[0].selector, '.bucket');
  t.is(root.nodes[1].selector, '.some-class:extend(@{variable})');
  t.truthy(root.nodes[1].extend);
});
