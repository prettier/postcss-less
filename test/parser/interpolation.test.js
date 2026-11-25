/* eslint no-useless-escape: off */

import test from 'ava';
import Input from 'postcss/lib/input';

import { parse } from '../../lib/index.js';
import { nodeToString } from '../utilities/node-to-string.js';
import tokenize from '../../lib/less-tokenize.js';
import { outdent } from 'outdent';

test('tokenizes interpolations as words with their source positions', (t) => {
  const tokenizer = tokenize(
    new Input('pre@{sizes["}"]}mid${prop}post @{outer-@{inner}}'),
  );
  const tokens = [];
  while (!tokenizer.endOfFile()) {
    tokens.push(tokenizer.nextToken());
  }

  t.deepEqual(tokens, [
    ['word', 'pre', 0, 2],
    ['word', '@{sizes["}"]}', 3, 15],
    ['word', 'mid', 16, 18],
    ['word', '${prop}', 19, 25],
    ['word', 'post', 26, 29],
    ['space', ' '],
    ['word', '@{outer-@{inner}}', 31, 47],
  ]);
});

test('reports unclosed interpolations and supports ignored errors', (t) => {
  for (const text of ['@{name', '${name']) {
    const tokenizer = tokenize(new Input(text));
    t.throws(() => tokenizer.nextToken(), {
      message: /Unclosed interpolation/,
    });

    const tolerant = tokenize(new Input(text));
    t.deepEqual(tolerant.nextToken({ ignoreUnclosed: true }), [
      'word',
      text,
      0,
      text.length - 1,
    ]);
    t.true(tolerant.endOfFile());
  }
});

test('preserves incomplete interpolation as literal string content', (t) => {
  const less = 'a { content: "@{unfinished"; }';
  const root = parse(less);

  t.is(root.first.first.value, '"@{unfinished"');
  t.is(nodeToString(root), less);
});

test('parses adjacent and nested interpolation throughout a rule', (t) => {
  const less =
    '@media @{outer-@{inner}} { .@{class}-${suffix} { ${prop}-@{part}: ${value}; } }';
  const root = parse(less);
  const rule = root.first.first;

  t.is(root.first.params, '@{outer-@{inner}}');
  t.is(rule.selector, '.@{class}-${suffix}');
  t.is(rule.first.prop, '${prop}-@{part}');
  t.is(rule.first.value, '${value}');
  t.is(rule.first.source.end.offset, less.indexOf(';') + 1);
  t.is(nodeToString(root), less);
});

test('parses interpolation', (t) => {
  const root = parse('@{selector}:hover { @{prop}-size: @{color} }');

  t.is(root.first.selector, '@{selector}:hover');
  t.is(root.first.first.prop, '@{prop}-size');
  t.is(root.first.first.value, '@{color}');
});

test('parses interpolation when there is not space between selector with open bracket', (t) => {
  const root = parse('@{selector}-title{ @{prop}-size: @{color} }');

  t.is(root.first.selector, '@{selector}-title');
  t.is(root.first.first.prop, '@{prop}-size');
  t.is(root.first.first.value, '@{color}');
});

test('parses mixin interpolation', (t) => {
  const less = '.browser-prefix(@prop, @args) {\n @{prop}: @args;\n}';
  const root = parse(less);

  t.is(root.first.selector, '.browser-prefix(@prop, @args)');
  t.is(root.first.first.prop, '@{prop}');
  t.is(root.first.first.value, '@args');
});

test('parses interpolation inside word', (t) => {
  const root = parse('.@{class} {}');

  t.is(root.first.selector, '.@{class}');
});

test('parses lookup interpolation in selectors', (t) => {
  for (const selector of [
    '.@{sizes[name]}',
    '@{sizes[ name ]}-large',
    '#@{sizes[nested][@key]}',
    '.@{sizes[name]}-@{other[value]}',
    '.@{sizes[name]}[data-value="large"]',
  ]) {
    const less = `${selector} { color: red }`;
    const root = parse(less);

    t.is(root.first.type, 'rule');
    t.is(root.first.selector, selector);
    t.is(root.first.first.value, 'red');
    t.is(nodeToString(root), less);
  }
});

test('parses lookup interpolation in at-rule params', (t) => {
  const less = '@media @{sizes[name]} { .a { color: red } }';
  const root = parse(less);

  t.is(root.first.params, '@{sizes[name]}');
  t.is(root.first.first.selector, '.a');
  t.is(nodeToString(root), less);
});

test('parses non-interpolation', (t) => {
  const root = parse('\\@{ color: black }');

  t.is(root.first.selector, '\\@');
});

test('parses interpolation in at-rule params (#180)', (t) => {
  const root = parse('@media @{mq-xs} { .a { color: red } }');

  t.is(root.first.type, 'atrule');
  t.is(root.first.name, 'media');
  t.is(root.first.params, '@{mq-xs}');
  t.is(root.first.first.selector, '.a');
});

test('parses interpolation in at-rule params without space before bracket (#180)', (t) => {
  const root = parse('@media @{mq-xs}{ .a { color: red } }');

  t.is(root.first.params, '@{mq-xs}');
  t.is(root.first.first.selector, '.a');
});

test('parses interpolation followed by a media feature (#180)', (t) => {
  const root = parse(
    '@media @{mq-xs} and (min-width: 5px) { .a { color: red } }',
  );

  t.is(root.first.params, '@{mq-xs} and (min-width: 5px)');
});

test('parses multiple interpolations in at-rule params (#180)', (t) => {
  const root = parse('@media @{a} and @{b} { .a { color: red } }');

  t.is(root.first.params, '@{a} and @{b}');
});

test('parses interpolation inside at-rule params word (#180)', (t) => {
  const root = parse(
    '@media screen and (max-width: @{w}) { .a { color: red } }',
  );

  t.is(root.first.params, 'screen and (max-width: @{w})');
});

test('parses a variable in at-rule params (#180)', (t) => {
  const root = parse('@media @mq-xs { .a { color: red } }');

  t.is(root.first.params, '@mq-xs');
});

// TODO: interpolation doesn't quite work yet
test('interpolation', (t) => {
  const root = parse('@{selector}:hover { @{prop}-size: @{color} }');
  const { first } = root;

  t.is(first.selector, '@{selector}:hover');
  t.is(first.first.prop, '@{prop}-size');
  t.is(first.first.value, '@{color}');
});

test('interpolation inside word', (t) => {
  const root = parse('.@{class} {}');
  const { first } = root;
  t.is(first.selector, '.@{class}');
});

test('parses escaping', (t) => {
  const code = `
    .m_transition (...) {
      @props: ~\`"@{arguments}".replace(/[\[\]]/g, '')\`;
      @var: ~ a;
      -webkit-transition: @props;
      -moz-transition: @props;
      -o-transition: @props;
      transition: @props;
    }

    .a {
      & ~ .stock-bar__content .stock-bar__control_pause {
        display: none;
      }
    }
`;

  const root = parse(code);
  const { first } = root;
  t.is(first.selector, '.m_transition (...)');
  t.is(first.first.name, 'props');
  t.is(first.first.value, '~`"@{arguments}".replace(/[[]]/g, \'\')`');
  t.is(
    root.nodes[1].first.selector,
    '& ~ .stock-bar__content .stock-bar__control_pause',
  );
});

test('support props', (t) => {
  // https://github.com/less/less.js/blob/713331655e437401dfea6cd233893a69762734e1/packages/test-data/tests-unit/property-accessors/property-accessors.less#L56-L59
  // https://github.com/less/less.js/blob/713331655e437401dfea6cd233893a69762734e1/packages/test-data/tests-unit/parser-property-interp/parser-property-interp.less#L12-L26
  const code = outdent`
    a {
      \${prop1}: #FF0000;  // not sure why you'd want to do this, but ok
      \${prop-name}: red;
      border-\${prop-name}-width: 2px;
      *-z-\${prop-name}: 1px dashed blue;
      \${my}-\${prop-name}-\${value}: green;
    }
  `;

  const root = parse(code);
  const nodes = root.first.nodes.filter((node) => node.type !== 'comment');
  t.is(nodes.length, 5);
  t.is(nodes[0].prop, '${prop1}');
  t.is(nodes[1].prop, '${prop-name}');
  t.is(nodes[2].prop, 'border-${prop-name}-width');
  t.is(nodes[3].prop, '-z-${prop-name}');
  t.is(nodes[4].prop, '${my}-${prop-name}-${value}');
  t.is(nodeToString(root), code);
});
