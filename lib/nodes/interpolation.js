/* eslint no-param-reassign: off */

import tokenize from 'postcss/lib/tokenize';

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
  let { tokenizer } = parser;
  const css = parser.input.css.valueOf();
  const commentIndex = (token) => {
    if (token[0] !== 'word' || token[2] === undefined) {
      return -1;
    }

    const index = token[1].indexOf('//');
    if (index >= 0) {
      return index;
    }

    return token[1].endsWith('/') && css[token[2] + token[1].length] === '/'
      ? token[1].length - 1
      : -1;
  };
  const startComment = commentIndex(start);
  if (startComment > 0) {
    tokenizer.back([
      'word',
      start[1].slice(startComment),
      start[2] + startComment,
      start[3],
    ]);
    start = ['word', start[1].slice(0, startComment), start[2]];
  }

  const tokens = [start];
  let token = tokenizer.nextToken();
  let previous = start;
  let inInterpolation = false;

  while (token) {
    const index = commentIndex(token);
    if (index > 0) {
      tokens.push(['word', token[1].slice(0, index), token[2]]);
      token = ['word', token[1].slice(index), token[2] + index];
    }

    if (index >= 0) {
      const newline = css.indexOf('\n', token[2]);
      let end = newline === -1 ? css.length : newline;
      if (css[end - 1] === '\r') {
        end--;
      }

      token = ['word', css.slice(token[2], end), token[2], end - 1];
      // Mask the consumed prefix so the new tokenizer keeps original offsets.
      tokenizer = tokenize({
        css: ' '.repeat(end) + css.slice(end),
        error: (...arguments_) => parser.input.error(...arguments_),
      });
      parser.tokenizer = tokenizer;
      tokenizer.nextToken();
      const space = css.slice(end, tokenizer.position());
      if (space) {
        tokenizer.back(['space', space]);
      }
    } else if (
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
