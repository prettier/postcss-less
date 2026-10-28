import test from 'ava';

import syntax from '../../lib/index.js';

const { parse, nodeToString } = syntax;

test('basic', (t) => {
  const params = '(  1, 2, 3; something, else; ...) when (@mode=huge)';
  const selector = `.foo ${params}`;
  const less = `${selector} { border: baz; }`;
  const root = parse(less);
  const { first } = root;

  t.is(first.type, 'rule');
  t.is(first.selector, selector);
  t.is(first.first.prop, 'border');
  t.is(first.first.value, 'baz');
  t.is(nodeToString(root), less);
});

test('without body', (t) => {
  const less = '.mixin-name (#FFF);';
  const root = parse(less);
  const { first } = root;

  t.is(first.type, 'atrule');
  t.is(first.name, 'mixin-name');
  t.is(first.params, '(#FFF)');
  t.falsy(first.nodes);
  t.is(nodeToString(root), less);
});

test('without body, no params', (t) => {
  const less = '.base { .mixin-name }';
  const root = parse(less);
  const { first } = root;

  t.is(first.first.type, 'atrule');
  t.is(first.first.name, 'mixin-name');
  t.falsy(first.params);
  t.falsy(first.first.nodes);
  t.is(nodeToString(root), less);
});

test('without body, no params, no whitepsace', (t) => {
  const less = '.base {.mixin-name}';
  const root = parse(less);
  const { first } = root;

  t.is(first.first.type, 'atrule');
  t.is(first.first.name, 'mixin-name');
  t.falsy(first.params);
  t.falsy(first.first.nodes);
  t.is(nodeToString(root), less);
});

// TODO: false positive, this is valid standard CSS syntax
// test('simple with params',  async (t) => {
//   const less = '.foo (@bar; @baz...) { border: baz; }';
//   const { first } = parse(less);
//
//   t.is(first.type, 'atrule');
// });

test('class and id selectors', (t) => {
  const less = `
    .mixin-class {
      .a(#FFF);
    }
    .mixin-id {
      #b (@param1; @param2);
    }

    .class {
      .mixin1 (


      )


      ;

      .mixin2
    }
`;

  const root = parse(less);
  const {
    nodes: [first, second, last],
  } = root;

  t.is(first.first.name, 'a');
  t.is(first.first.params, '(#FFF)');

  t.is(second.first.name, 'b');
  t.is(second.first.params, '(@param1; @param2)');

  t.is(last.first.name, 'mixin1');
  t.true(/\(\s+\)/.test(last.first.params));
});

test('namespaces', (t) => {
  const less = `
    .c {
      #outer > .inner;
      #space > .importer-1();
    }
`;

  const root = parse(less);
  const { first } = root;

  t.is(first.selector, '.c');
  t.is(first.nodes.length, 2);
  t.is(nodeToString(root), less);
});

test('guarded namespaces', (t) => {
  const less = `
    #namespace when (@mode=huge) {
      .mixin() { /* */ }
    }

    #namespace {
      .mixin() when (@mode=huge) { /* */ }
    }
`;

  const root = parse(less);
  const { first } = root;

  t.is(first.first.selector, '.mixin()');
  t.is(first.next().first.selector, '.mixin() when (@mode=huge)');
  t.is(nodeToString(root), less);
});

test('mixins with `!important`', (t) => {
  const less = `
                    .foo() !important;
                `;

  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'foo');
  t.is(first.params, '()');
  t.is(first.important, true);
  t.is(nodeToString(root), less);
});

test('case-insensitive !important', (t) => {
  const less = `
                    .foo() !IMPoRTant;
                `;

  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'foo');
  t.is(first.params, '()');
  t.is(first.important, true);
  t.is(nodeToString(root), less);
});

test('!important, no whitespace', (t) => {
  const less = `
                    .foo()!important;
                `;

  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'foo');
  t.is(first.params, '()');
  t.is(first.important, true);
  t.is(nodeToString(root), less);
});

test('!important, whitespace between', (t) => {
  const less = `
                    .foo()! important;
                `;
  const root = parse(less);
  const { first } = root;
  t.is(first.name, 'foo');
  t.is(first.params, '()');
  t.is(first.important, true);
  t.is(nodeToString(root), less);
});

test('!important, whitespace before and between', (t) => {
  const less = `
                    .foo() ! important;
                `;
  const root = parse(less);
  const { first } = root;
  t.is(first.name, 'foo');
  t.is(first.params, '()');
  t.is(first.important, true);
  t.is(nodeToString(root), less);
});

test('parses nested mixins with the rule set', (t) => {
  const params = '({background-color: red;})';
  const ruleSet = `.desktop-and-old-ie ${params}`;
  const less = `header { ${ruleSet}; }`;
  const root = parse(less);
  const { first } = root;

  t.is(first.selector, 'header');
  t.is(first.first.name, 'desktop-and-old-ie');
  t.is(first.first.params, params);
  t.falsy(first.first.nodes);
  t.is(nodeToString(root), less);
});

test('should parse nested mixin', (t) => {
  const less = `
  .badge-quality {
    &:extend(.label, .m_text-uppercase);
    font-size: 85%;
    font-weight: normal;
    min-width: 2rem;
    height: 2rem;
    padding: 0.2rem 0.3rem;
    display: inline-block;
    border-radius: 0;
    cursor: default;
    line-height: 1.6rem;
    color: @c_white;
    background-color: @c_blue1;

    &_info {
      background-color: @c_blue5;
    }

    &_danger {
      background-color: @c_red2;
    }

    &_success {
      background-color: @c_green3;
    }

    &_warning {
      background-color: @c_yellow1;
      color: @c_black1;
    }
  }

  .badge-category {
    &:extend(.m_badge-default);
  }

  .buy-sell-badge {
    .m_text-uppercase();

    &_buy {
      &:extend(.m_text-success);
    }

    &_sell {
      &:extend(.m_text-error);
    }
  }
`;

  const root = parse(less);

  t.is(root.nodes.length, 3);
  t.is(nodeToString(root), less);
});

test('mixin missing semicolon (#110)', (t) => {
  const less = '.foo{.bar("baz")}';
  const root = parse(less);
  const { first } = root;

  t.is(first.first.name, 'bar');
  t.is(nodeToString(root), less);
});

test('important in parameters (#102)', (t) => {
  const less = `.f(
	@a : {
		color : red !important;
		background : blue;
	}
);`;
  const root = parse(less);
  const { first } = root;

  t.falsy(first.important);
  t.is(nodeToString(root), less);
});

test('mixin parameters with functions (#122)', (t) => {
  const less = `.mixin({
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
});`;
  const root = parse(less);
  const { first } = root;

  t.is(first.name, 'mixin');
  t.is(nodeToString(root), less);
});

test('mixin parameters with multiple parens', (t) => {
  const less = `.mixin({
  &__icon {
      background-image: url('./icon.svg');
      width: calc(~"100% + 1px");
  }
});
.two {}`;

  const root = parse(less);
  const { first, last } = root;

  t.is(first.name, 'mixin');
  t.is(last.selector, '.two');
  t.is(nodeToString(root), less);
});
