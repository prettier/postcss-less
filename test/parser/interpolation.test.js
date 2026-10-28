/* eslint no-useless-escape: off */

import test from 'ava';

import { parse } from '../../lib/index.js';

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
  const root = parse('@media @{mq-xs} and (min-width: 5px) { .a { color: red } }');

  t.is(root.first.params, '@{mq-xs} and (min-width: 5px)');
});

test('parses multiple interpolations in at-rule params (#180)', (t) => {
  const root = parse('@media @{a} and @{b} { .a { color: red } }');

  t.is(root.first.params, '@{a} and @{b}');
});

test('parses interpolation inside at-rule params word (#180)', (t) => {
  const root = parse('@media screen and (max-width: @{w}) { .a { color: red } }');

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
