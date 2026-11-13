import test from 'ava';

import { parse, nodeToString } from '../../lib/index.js';
import { outdent } from 'outdent';

test('basic', (t) => {
  for (const code of [
    'a {test-collapse();}',
    'a {store(@var);}',
    'a {store(5);}',
    'a {store("bird");}',
    'test-atrule("@charset"; "utf-8");',
    'test-atrule("@arbitrary"; "value after ()");',
    outdent`
      #if {
        if((false), {g: 7}); /* results in void */
      }
    `,
    "e('/* anything to unquote */');",
  ]) {
    let root;
    t.notThrows(() => {
      root = parse(code);
    });
    t.is(nodeToString(root), code);
  }
});
