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
  let brackets = 0;
  let closed = false;
  while (
    token &&
    (validTypes.includes(token[0]) ||
      (!closed && token[0] === '[') ||
      (brackets > 0 && ['at-word', 'space', 'string', ']'].includes(token[0])))
  ) {
    if (token[0] === '[') {
      brackets++;
    } else if (token[0] === ']') {
      brackets--;
    } else if (token[0] === '}') {
      closed = true;
    }
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

export function mergeDollarInterpolation(parser, start) {
  const { tokenizer } = parser;
  const tokens = [start];
  let token = tokenizer.nextToken();
  let previous = start;
  let inInterpolation = false;

  while (token) {
    if (
      token[0] === '{' &&
      previous[0] === 'word' &&
      previous[1].endsWith('$')
    ) {
      token = ['[', ...token.slice(1)];
      inInterpolation = true;
    } else if (token[0] === '}' && inInterpolation) {
      token = [']', ...token.slice(1)];
      inInterpolation = false;
    }

    tokens.push(token);

    if (!inInterpolation && [';', '{', '}'].includes(token[0])) {
      break;
    }

    previous = token;
    token = tokenizer.nextToken();
  }

  for (const token of tokens.reverse()) {
    tokenizer.back(token);
  }

  return tokenizer.nextToken();
}

export function mergeArrowFunctionBlock(parser, token) {
  if (!token[1].startsWith('@')) {
    return;
  }

  const { tokenizer } = parser;
  const tokens = [];
  let previous;
  let current = tokenizer.nextToken();

  while (current) {
    tokens.push(current);

    if (current[0] === '{') {
      if (previous?.[1] === '=>') {
        let depth = 1;
        let closing;

        while (depth && (closing = tokenizer.nextToken())) {
          tokens.push(closing);

          if (closing[0] === '{') {
            depth++;
          } else if (closing[0] === '}') {
            depth--;
          }
        }

        if (depth === 0) {
          const openingIndex = tokens.indexOf(current);
          tokens[openingIndex] = ['[', ...current.slice(1)];
          tokens[tokens.length - 1] = [
            ']',
            ...tokens[tokens.length - 1].slice(1),
          ];
        }
      }

      break;
    }

    if ([';', '}'].includes(current[0])) {
      break;
    }

    if (current[0] !== 'space' && current[0] !== 'comment') {
      previous = current;
    }

    current = tokenizer.nextToken();
  }

  for (const current of tokens.reverse()) {
    tokenizer.back(current);
  }
}
