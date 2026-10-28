import test from 'ava';
import { parse } from '../lib/index.js';

test('should not crash', async (t) => {
  const result = parse('.x');

  t.truthy(result);
});
