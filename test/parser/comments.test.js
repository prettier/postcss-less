import test from 'ava';
import Comment from 'postcss/lib/comment';
import { outdent } from 'outdent';
import { parse } from '../../lib/index.js';
import { nodeToString } from '../utilities/node-to-string.js';

test('inline comment', (t) => {
  const less = '// batman';
  const root = parse(less);
  const { first } = root;

  t.truthy(root);
  t.true(first instanceof Comment);
  t.true(first.inline);
  t.is(first.text, 'batman');
  t.is(nodeToString(root), less);
});

test('two-line inline comment with a single quote and windows EOL', (t) => {
  const less = `// it's first comment (this line should end with Windows new line symbols)\r\n// it's second comment`;
  const root = parse(less);
  const [first, second, ...rest] = root.nodes;

  t.truthy(root);
  t.true(first instanceof Comment);
  t.true(first.inline);
  t.is(
    first.text,
    `it's first comment (this line should end with Windows new line symbols)`,
  );
  t.true(second instanceof Comment);
  t.true(second.inline);
  t.is(second.text, `it's second comment`);
  t.is(nodeToString(root), less);
  t.is(rest.length, 0);
});

test('inline comment without leading space', (t) => {
  const less = '//batman';
  const root = parse(less);
  const { first } = root;

  t.truthy(root);
  t.true(first instanceof Comment);
  t.true(first.inline);
  t.is(first.text, 'batman');
  t.is(nodeToString(root), less);
});

test('inline comment with unclosed characters', (t) => {
  const less = `// unclosed ' test { test ( test /*`;
  const root = parse(less);
  const { first } = root;

  t.truthy(root);
  t.true(first instanceof Comment);
  t.true(first.inline);
  t.is(first.text, less.slice(3));
  t.is(nodeToString(root), less);
});

test('inline comment with unclosed characters and future statements', (t) => {
  const less = `// unclosed ' test { test ( test /* test "\nfoo: 'bar';\nbar: "foo"\nabc: (def)\n foo{}`;
  const root = parse(less);
  const { first } = root;

  t.truthy(root);
  t.true(first instanceof Comment);
  t.true(first.inline);
  // first.text should only contain the comment line without the `// `
  t.is(first.text, less.substring(0, less.indexOf('\n')).slice(3));
  t.is(nodeToString(root), less);
});

test('inline comment with closed characters and future statements', (t) => {
  const less = `// closed '' test {} test () test /* */ test "\nfoo: 'bar';\nbar: "foo"\nabc: (def)\n foo{}`;
  const root = parse(less);
  const { first } = root;

  t.truthy(root);
  t.true(first instanceof Comment);
  t.true(first.inline);
  // first.text should only contain the comment line without the `// `
  t.is(first.text, less.substring(0, less.indexOf('\n')).slice(3));
  t.is(nodeToString(root), less);
});

test('two subsequent inline comments with unmatched quotes', (t) => {
  const less = `// first unmatched '\n// second ' unmatched\nfoo: 'bar';`;
  const root = parse(less);
  const [firstComment, secondComment] = root.nodes;

  t.truthy(root);
  t.true(firstComment instanceof Comment);
  t.true(secondComment instanceof Comment);
  t.true(firstComment.inline);
  t.true(secondComment.inline);
  // firstComment.text & secondComment.text should only contain the comment line without the `// `
  const lines = less.split('\n');
  t.is(firstComment.text, lines[0].slice(3));
  t.is(secondComment.text, lines[1].slice(3));
  t.is(nodeToString(root), less);
});

test('inline comments with quotes and new line(#145)', (t) => {
  const less = `
      // batman'
  `;

  const root = parse(less);
  const { first } = root;

  t.is(first.type, 'comment');
  t.is(first.text, `batman'`);
  t.is(nodeToString(root), less);
});

test('close empty', (t) => {
  const less = '// \n//';
  const root = parse(less);
  const { first, last } = root;

  t.truthy(root.nodes.length);
  t.is(first.text, '');
  t.is(last.text, '');
  t.is(nodeToString(root), less);
});

test('close inline and block', (t) => {
  const less = '// batman\n/* cleans the bat cave */';
  const root = parse(less);
  const { first, last } = root;

  t.truthy(root.nodes.length);
  t.is(first.text, 'batman');
  t.is(last.text, 'cleans the bat cave');
  t.is(nodeToString(root), less);
});

test('parses multiline comments', (t) => {
  const text = 'batman\n   robin\n   joker';
  const less = ` /* ${text} */ `;
  const root = parse(less);
  const { first } = root;

  t.is(root.nodes.length, 1);
  t.is(first.text, text);
  t.deepEqual(first.raws, {
    before: ' ',
    left: ' ',
    right: ' ',
  });
  t.falsy(first.inline);
  t.is(nodeToString(root), less);
});

test('ignores pseudo-comments constructions', (t) => {
  const less = 'a { cursor: url(http://site.com) }';
  const root = parse(less);
  const { first } = root;

  t.false(first instanceof Comment);
  t.is(nodeToString(root), less);
});

test('newlines are put on the next node', (t) => {
  const less = '// a comment\n.a {}';

  const root = parse(less);
  const { first, last } = root;

  t.is(first.raws.right, '');
  t.is(last.raws.before, '\n');
});

test('inline comments with asterisk are persisted (#135)', (t) => {
  const less = '//*batman';

  const root = parse(less);
  const { first } = root;

  t.is(first.type, 'comment');
  t.is(first.text, '*batman');
  t.is(nodeToString(root), less);
});

test('handles single quotes in comments (#163)', (t) => {
  const less = outdent`
    a {
      // '
      color: pink;
    }

    /** ' */
  `;

  const root = parse(less);

  const [ruleNode, commentNode] = root.nodes;

  t.is(ruleNode.type, 'rule');
  t.is(commentNode.type, 'comment');

  t.is(commentNode.source.start.line, 6);
  t.is(commentNode.source.start.column, 1);
  t.is(commentNode.source.end.line, 6);
  t.is(commentNode.source.end.column, 8);

  const [innerCommentNode, declarationNode] = ruleNode.nodes;

  t.is(innerCommentNode.type, 'comment');
  t.is(declarationNode.type, 'decl');

  t.is(innerCommentNode.source.start.line, 2);
  t.is(innerCommentNode.source.start.column, 3);
  t.is(innerCommentNode.source.end.line, 2);
  t.is(innerCommentNode.source.end.column, 6);

  t.is(declarationNode.source.start.line, 3);
  t.is(declarationNode.source.start.column, 3);
  t.is(declarationNode.source.end.line, 3);
  t.is(declarationNode.source.end.column, 14);

  t.is(nodeToString(root), less);
});

test('preserves comment boundaries and source offsets', (t) => {
  const less = `// it's /* " */\r\n.a { color: red; }\r// last`;
  const root = parse(less);
  const [first, rule, last] = root.nodes;

  t.is(first.text, `it's /* " */`);
  t.is(
    less.slice(first.source.start.offset, first.source.end.offset),
    `// it's /* " */`,
  );
  t.is(
    less.slice(rule.source.start.offset, rule.source.end.offset),
    '.a { color: red; }',
  );
  t.is(less.slice(last.source.start.offset, last.source.end.offset), '// last');
  t.is(last.text, 'last');
  t.is(nodeToString(root), less);
});

test('Should have the same input in every node', (t) => {
  const code = outdent`
    // "comment
    a { content: "value"; color: red !important; }
  `;
  const root = parse(code);
  const input = root.source.input;

  t.is(input.css, code);

  // Make sure input doesn't change after parsing
  root.walk((node) => {
    t.is(node.source.input, input);
  });
});

test('preserves source.input.file after inline comments', (t) => {
  const from = '/repro.less';
  const less = `a {\n  // it's\n  color: red;\n}\nb { content: 'x'; }\n`;

  const root = parse(less, { from });

  const nodes = [];
  root.walk((node) => nodes.push(node));

  for (const node of nodes) {
    t.is(node.source.input.file, from);
    t.is(node.source.input, root.source.input);
  }

  t.deepEqual(
    nodes.map((node) => [node.type, node.source.start.line]),
    [
      ['rule', 1],
      ['comment', 2],
      ['decl', 3],
      ['rule', 5],
      ['decl', 5],
    ],
  );

  t.is(nodeToString(root), less);
});

test('comment in selector', (t) => {
  const code = outdent`
    a // comment"
    {}
  `;

  const root = parse(code);
  t.is(nodeToString(root), code);
});

test('issue 172', (t) => {
  for (const code of [
    outdent`
      .foo {
        top:
          calc(
            // don't
            10px
          );
      }
      // don't
    `,
    outdent`
      .foo {
        top:
          calc(
            // don't
            10px
          );
      }
    `,
  ]) {
    const root = parse(code);
    t.is(nodeToString(root), code);
  }
});

test('should preserve comments in selector', (t) => {
  {
    const selector = outdent`
      a,
      // comment
      b
    `;

    const code = `${selector} {}`;
    const root = parse(code);
    t.is(root.first.selector, selector);
    t.is(nodeToString(root), code);
  }

  {
    const code = outdent`
      a,
      b
      // comment
      {}
    `;
    const root = parse(code);
    t.is(root.first.selector, 'a,\nb');
    t.is(root.first.raws.between, '\n// comment\n');
    t.is(nodeToString(root), code);
  }
});
