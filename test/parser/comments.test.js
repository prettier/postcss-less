import test from 'ava';
import Comment from 'postcss/lib/comment';

import syntax from '../../lib/index.js';

const { parse, nodeToString } = syntax;

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
    `it's first comment (this line should end with Windows new line symbols)`
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
  const less = '// batman\n/* cleans the batcave */';
  const root = parse(less);
  const { first, last } = root;

  t.truthy(root.nodes.length);
  t.is(first.text, 'batman');
  t.is(last.text, 'cleans the batcave');
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
    right: ' '
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
  const less = `a {\n  // '\n  color: pink;\n}\n\n/** ' */`;

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
