import test from 'ava';

import { parse, nodeToString } from '../../lib/index.js';

test('parses escaped string', (t) => {
  const less = `
  @testVar: 10px;

  .test-wrap {
    .selector {
      height: calc(~"100vh - @{testVar}");
    }
  }
`;
  const root = parse(less);
  const { first, last } = root;

  t.is(first.name, 'testVar');
  t.is(first.value, '10px');
  t.is(last.first.first.prop, 'height');
  t.is(last.first.first.value, 'calc(~"100vh - @{testVar}")');
  t.is(nodeToString(root), less);
});

test('parses escaping inside nested rules', (t) => {
  const less = `
  .test1 {
    .another-test {
      prop1: function(~"@{variable}");
    }
  }

  .test2 {
    prop2: function(~\`@{test}\`);
  }

  .test3 {
    filter: ~"alpha(opacity='@{opacity}')";
  }
`;
  const root = parse(less);

  t.is(root.nodes[0].first.first.prop, 'prop1');
  t.is(root.nodes[0].first.first.value, 'function(~"@{variable}")');
  t.is(root.nodes[1].first.prop, 'prop2');
  t.is(root.nodes[1].first.value, 'function(~`@{test}`)');
  t.is(root.nodes[2].first.prop, 'filter');
  t.is(root.nodes[2].first.value, '~"alpha(opacity=\'@{opacity}\')"');
  t.is(nodeToString(root), less);
});
