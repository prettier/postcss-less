/* eslint no-param-reassign: off */

export function isInterpolation(token) {
  const tokens = [token, this.tokenizer.nextToken()];
  const validTypes = ['word', '}'];

  // look for @{ but not @[word]{
  if (tokens[0][1].length > 1 || tokens[1][0] !== '{') {
    this.tokenizer.back(tokens[1]);
    return false;
  }

  token = this.tokenizer.nextToken();
  while (token && validTypes.includes(token[0])) {
    tokens.push(token);
    token = this.tokenizer.nextToken();
  }

  const words = tokens.map((token) => token[1]);
  const [first] = tokens;
  const last = tokens.pop();
  const newToken = ['word', words.join(''), first[2], last[2]];

  this.tokenizer.back(token);
  this.tokenizer.back(newToken);

  return true;
}

// #180: `@media @{mq}` - merge `@{…}` sequences in the prelude into single word tokens,
// otherwise the interpolation's `{` is mistaken for the start of the at-rule block
export function mergeParamsInterpolation(parser) {
  const tokens = [];
  let token = parser.tokenizer.nextToken();

  while (token) {
    if (
      token[0] === 'at-word' &&
      token[1] === '@' &&
      isInterpolation.bind(parser)(token)
    ) {
      token = parser.tokenizer.nextToken();

      if (!token) {
        break;
      }
    }

    tokens.push(token);

    if (token[0] === '{' || token[0] === '}' || token[0] === ';') {
      break;
    }

    token = parser.tokenizer.nextToken();
  }

  for (const token of tokens.reverse()) {
    parser.tokenizer.back(token);
  }
}
