import Input from 'postcss/lib/input';
import LessParser from './LessParser.js';
import LessStringifier from './LessStringifier.js';

export function nodeToString(node) {
  let result = '';

  stringify(node, (bit) => {
    result += bit;
  });

  return result;
}

export function parse(less, options) {
  const input = new Input(less, options);
  const parser = new LessParser(input);

  parser.parse();

  // To handle double-slash comments (`//`) we end up creating a new tokenizer
  // in certain cases (see `lib/nodes/inline-comment.js`). However, this means
  // that any following node in the AST will have incorrect start/end positions
  // on the `source` property. To fix that, we'll walk the AST and compute
  // updated positions for all nodes.
  parser.root.walk((node) => {
    const offset = input.css.lastIndexOf(node.source.input.css);

    if (offset === 0) {
      // Short circuit - this node was processed with the original tokenizer
      // and should therefore have correct position information.
      return;
    }

    // This ensures that the chunk of source we're processing corresponds
    // strictly to a terminal substring of the input CSS. This should always
    // be the case, but if it ever isn't, we prefer to fail instead of
    // producing potentially invalid output.
    // istanbul ignore next
    if (offset + node.source.input.css.length !== input.css.length) {
      throw new Error('Invalid state detected in postcss-less');
    }

    const newStartOffset = offset + node.source.start.offset;
    const newStartPosition = input.fromOffset(
      offset + node.source.start.offset,
    );

    node.source.start = {
      column: newStartPosition.col,
      line: newStartPosition.line,
      offset: newStartOffset,
    };

    // Not all nodes have an `end` property.
    if (node.source.end) {
      const newEndOffset = offset + node.source.end.offset;
      const newEndPosition = input.fromOffset(offset + node.source.end.offset);

      node.source.end = {
        column: newEndPosition.col,
        line: newEndPosition.line,
        offset: newEndOffset,
      };
    }
  });

  return parser.root;
}

export function stringify(node, builder) {
  const stringifier = new LessStringifier(builder);
  stringifier.stringify(node);
}

const syntax = { parse, stringify };

export default syntax;
