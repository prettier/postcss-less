/* eslint no-param-reassign: off */

export function isInterpolation(parser, token) {
  const { tokenizer } = parser;
  const tokens = [token, tokenizer.nextToken()];
  const validTypes = ['word', '}'];

  // look for @{ but not @[word]{
  if (tokens[0][1].length > 1 || tokens[1][0] !== '{') {
    tokenizer.back(tokens[1]);
    return false;
  }

  token = tokenizer.nextToken();
  while (token && validTypes.includes(token[0])) {
    tokens.push(token);
    token = tokenizer.nextToken();
  }

  const words = tokens.map((token) => token[1]);
  const [first] = tokens;
  const last = tokens.pop();
  const newToken = ['word', words.join(''), first[2], last[2]];

  tokenizer.back(token);
  tokenizer.back(newToken);

  return true;
}

// #180: `@media @{mq}` - merge `@{…}` sequences in the prelude into single word tokens,
// otherwise the interpolation's `{` is mistaken for the start of the at-rule block
export function mergeParamsInterpolation(parser) {
  const { tokenizer } = parser;
  const tokens = [];
  let token = tokenizer.nextToken();

  while (token) {
    if (
      token[0] === 'at-word' &&
      token[1] === '@' &&
      isInterpolation(parser, token)
    ) {
      token = tokenizer.nextToken();

      if (!token) {
        break;
      }
    }

    tokens.push(token);

    if (token[0] === '{' || token[0] === '}' || token[0] === ';') {
      break;
    }

    token = tokenizer.nextToken();
  }

  for (const token of tokens.reverse()) {
    tokenizer.back(token);
  }
}
