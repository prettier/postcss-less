import Input from 'postcss/lib/input';
import { LessParser } from './LessParser.js';
import { LessStringifier } from './LessStringifier.js';

function nodeToString(node) {
  let result = '';

  stringify(node, (bit) => {
    result += bit;
  });

  return result;
}

function parse(less, options) {
  const input = new Input(less, options);
  const parser = new LessParser(input);

  parser.parse();

  return parser.root;
}

function stringify(node, builder) {
  const stringifier = new LessStringifier(builder);
  stringifier.stringify(node);
}

const syntax = { parse, stringify };

export default syntax;
export { syntax as 'module.exports', stringify, parse, nodeToString };
