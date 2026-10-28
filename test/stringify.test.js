import test from 'ava';

import { parse, nodeToString } from '../lib/index.js';

const run = (less) => {
  const root = parse(less);
  return nodeToString(root);
};

test('inline comment', (t) => {
  const result = run('// comment\na {}');
  t.is(result, '// comment\na {}');
});

test('inline comment in the end of file', (t) => {
  const result = run('// comment');
  t.is(result, '// comment');
});

test('mixin without body', async (t) => {
  const less = '.selector:extend(.f, .g)  {&:extend(.a);}';
  const result = run(less);
  t.is(result, less);
});

test('mixins', (t) => {
  const less = '.foo (@bar; @baz...) { border: baz; }';
  const result = run(less);
  t.is(result, less);
});

test('mixin without body. #2', async (t) => {
  const less = '.mix() {color: red} .selector {.mix()}';
  const result = run(less);
  t.is(result, less);
});

test('mixin without body. #3', async (t) => {
  const less = `
  .container {
      .mixin-1();
      .mixin-2;
      .mixin-3 (@width: 100px) {
          width: @width;
      }
  }

  .rotation(@deg:5deg){
    .transform(rotate(@deg));
  }
`;

  const result = run(less);
  t.is(result, less);
});

test('mixin with !important', async (t) => {
  const less = '.foo { .mix() ! important; }';
  const result = run(less);
  t.is(result, less);
});
