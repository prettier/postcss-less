import LessStringifier from './less-stringifier.js';

function lessStringify(node, builder) {
  const stringifier = new LessStringifier(builder);
  stringifier.stringify(node);
}

export default lessStringify;
