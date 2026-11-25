import Input from 'postcss/lib/input';
import LessParser from './less-parser.js';

function lessParse(less, options) {
  const input = new Input(less, options);
  const parser = new LessParser(input);

  parser.parse();

  return parser.root;
}

export default lessParse;
