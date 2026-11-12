import test from 'ava';
import { parse } from '../lib/index.js';
import lessTestSuite from 'less-test-suite';

const invalid = new Set(['tests-unit/import/import/invalid-css.less']);
const failingTests = new Set([
  'tests-unit/property-accessors/property-accessors.less',
  'tests-unit/plugin/plugin.less',
  'tests-unit/permissive-parse/permissive-parse.less',
  'tests-unit/parser-property-interp/parser-property-interp.less',
  'tests-unit/mixins-interpolated/mixins-interpolated.less',
  'tests-unit/functions/functions.less',
  'tests-unit/css-escapes/css-escapes.less',
]);

for (const { name, input } of lessTestSuite) {
  if (invalid.has(name)) {
    continue;
  }

  const expectFailure = failingTests.has(name);

  (expectFailure ? test.failing : test)(name, (t) => {
    t.notThrows(() => parse(input));
  });
}
