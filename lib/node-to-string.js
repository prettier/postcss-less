import stringify from './less-stringify.js';

function nodeToString(node) {
  let result = '';

  stringify(node, (bit) => {
    result += bit;
  });

  return result;
}

export { nodeToString };
