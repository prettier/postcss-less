import test from 'ava';

import { parse, nodeToString } from '../../lib/index.js';

test('basic', (t) => {
  for (const code of [
    'a {test-collapse();}',
    'a {store(@var);}',
    'a {store(5);}',
    'a {store("bird");}',
    'test-atrule("@charset"; "utf-8");',
    'test-atrule("@arbitrary"; "value after ()");',
  ]) {
    let root;
    t.notThrows(() => {
      root = parse(code);
    });
    // console.log(root.nodes[0].nodes[0]);
    t.is(nodeToString(root), code);
  }
});
