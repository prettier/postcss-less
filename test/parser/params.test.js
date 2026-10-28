import test from 'ava';

import { parse, nodeToString } from '../../lib/index.js';

test('should not assign parameters for pseudo-selectors (#56)', (t) => {
  const less = '.test2:not(.test3) {}';
  const root = parse(less);
  const { first } = root;

  t.is(first.selector, '.test2:not(.test3)');
  t.falsy(first.params);
  t.is(nodeToString(root), less);
});

// sanity check = require(issue #99
test('should not assign parameters for bracket selectors', (t) => {
  const less =
    '@media only screen and ( max-width: ( @narrow - 1px ) ) {\n  padding: 10px 24px 20px;\n}';
  const root = parse(less);
  const { first } = root;

  t.is(first.type, 'atrule');
  t.is(nodeToString(root), less);
});

test('should not assign parameters for bracket selectors (2)', (t) => {
  const less = '.test1,.test2[test=test] {}';
  const root = parse(less);
  const { first } = root;

  t.is(first.selector, '.test1,.test2[test=test]');
  t.falsy(first.params);
  t.is(nodeToString(root), less);
});
