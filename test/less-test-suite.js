import test from 'ava';
import { parse, nodeToString } from '../lib/index.js';
import lessTestSuite from 'less-test-suite';

const skipTests = new Set([
  'tests-unit/import/import/invalid-css.less',
  'tests-unit/permissive-parse/permissive-parse.less',
]);
const failingTests = new Set([]);

for (const { name, input } of lessTestSuite) {
  if (skipTests.has(name)) {
    continue;
  }

  const expectFailure = failingTests.has(name);

  (expectFailure ? test.failing : test)(name, (t) => {
    let root;
    t.notThrows(() => {
      root = parse(input);
    });

    t.is(nodeToString(root), input);
  });
}
