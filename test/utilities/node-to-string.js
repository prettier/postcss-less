import { stringify } from '../../lib/index.js';

function nodeToString(node) {
  let result = '';

  stringify(node, (bit) => {
    result += bit;
  });

  return result;
}

export { nodeToString };
