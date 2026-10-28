import test from 'ava';

import { parse, nodeToString } from '../../lib/index.js';

test('each (#121)', (t) => {
  const params = `(@colors, {
  .@{value}-color {
    color: @value;
  }
})`;
  const less = `each${params};`;
  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'each');
  t.is(first.params, params);
  t.truthy(first.function);

  t.is(nodeToString(root), less);
});
