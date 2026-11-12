import test from 'ava';
import { parse } from '../lib/index.js';
import lessTestSuite from 'less-test-suite';

const invalid = new Set(['tests-unit/import/import/invalid-css.less']);

for (const { name, input } of lessTestSuite) {
  if (invalid.has(name)) {
    continue;
  }

  test(name, (t) => {
    t.notThrows(() => parse(input));
  });
}
