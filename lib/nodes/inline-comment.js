import tokenize from 'postcss/lib/tokenize';
import Input from 'postcss/lib/input';

export function isInlineComment(parser, token) {
  if (token[0] === 'word' && token[1].slice(0, 2) === '//') {
    const first = token;
    const bits = [];
    let endOffset;
    let remainingInput;

    while (token) {
      if (/\r?\n/.test(token[1])) {
        // If there are quotes, fix tokenizer creating one token from start quote to end quote
        if (/['"].*\r?\n/.test(token[1])) {
          // Add string before newline to inline comment token
          bits.push(token[1].substring(0, token[1].indexOf('\n')));

          // Get remaining input and re-tokenize
          remainingInput = token[1].substring(token[1].indexOf('\n'));
          const untokenizedRemainingInput = parser.input.css
            .valueOf()
            .substring(parser.tokenizer.position());
          remainingInput += untokenizedRemainingInput;

          endOffset =
            token[3] + untokenizedRemainingInput.length - remainingInput.length;
        } else {
          // If the tokenizer went to the next line go back
          parser.tokenizer.back(token);
        }
        break;
      }

      bits.push(token[1]);

      endOffset = token[2];
      token = parser.tokenizer.nextToken({ ignoreUnclosed: true });
    }

    const newToken = ['comment', bits.join(''), first[2], endOffset];
    parser.inlineComment(newToken);

    // Replace tokenizer to re-tokenize the rest of the string
    // we need replace it after we added new token with inline comment because token position is calculated for old input (#145)
    if (remainingInput) {
      const input = new Input(remainingInput);
      const tokenizer = tokenize(input);
      parser.input = input;
      parser.tokenizer = tokenizer;
    }

    return true;
  } else if (token[1] === '/') {
    // issue #135
    const next = parser.tokenizer.nextToken({ ignoreUnclosed: true });

    if (next[0] === 'comment' && /^\/\*/.test(next[1])) {
      next[0] = 'word';
      next[1] = next[1].slice(1);
      token[1] = '//';
      parser.tokenizer.back(next);
      return isInlineComment(parser, token);
    }
  }

  return false;
}
