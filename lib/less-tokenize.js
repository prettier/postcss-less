/*
Based on
1. PostCSS's lib/tokenize.js https://github.com/postcss/postcss/blob/5a8174feb01de7a1fac6ccbb4ecd3376ebb3834a/lib/tokenize.js#L1
1. PostCSS-SCSS's lib/scss-tokenize.js https://github.com/postcss/postcss-scss/blob/028380809e01f5f40367464524b64f1101ae270f/lib/scss-tokenize.js
*/

const SINGLE_QUOTE = "'".charCodeAt(0)
const DOUBLE_QUOTE = '"'.charCodeAt(0)
const BACKSLASH = '\\'.charCodeAt(0)
const SLASH = '/'.charCodeAt(0)
const NEWLINE = '\n'.charCodeAt(0)
const SPACE = ' '.charCodeAt(0)
const FEED = '\f'.charCodeAt(0)
const TAB = '\t'.charCodeAt(0)
const CR = '\r'.charCodeAt(0)
const OPEN_SQUARE = '['.charCodeAt(0)
const CLOSE_SQUARE = ']'.charCodeAt(0)
const OPEN_PARENTHESES = '('.charCodeAt(0)
const CLOSE_PARENTHESES = ')'.charCodeAt(0)
const OPEN_CURLY = '{'.charCodeAt(0)
const CLOSE_CURLY = '}'.charCodeAt(0)
const SEMICOLON = ';'.charCodeAt(0)
const ASTERISK = '*'.charCodeAt(0)
const COLON = ':'.charCodeAt(0)
const AT = '@'.charCodeAt(0)

// LESS PATCH {
const RE_AT_END = /[\t\n\f\r "#'():/;[\\\]{}]/g
const RE_WORD_END = /[\t\n\f\r !"#'():;@[\\\]{}]|\/(?=\*)|\$(?=\{)/g
// } LESS PATCH
const RE_BAD_BRACKET = /.[\r\n"'(/\\]/
const RE_HEX_ESCAPE = /[\da-f]/i

// LESS PATCH {
const DOLLAR = '$'.charCodeAt(0)
const RE_NEW_LINE = /[\n\f\r]/g
// } LESS PATCH

// LESS PATCH {
export default function tokenizer(input, options = {}) {
// } LESS PATCH
  let css = input.css.valueOf()
  let ignore = options.ignoreErrors

  let code, content, escape, next, quote
  let currentToken, escaped, escapePos, n, prev

  let length = css.length
  let pos = 0
  let buffer = []
  let returned = []
  let lastBadParen = -1

  function position() {
    return pos
  }

  function unclosed(what) {
    throw input.error('Unclosed ' + what, pos)
  }

  function endOfFile() {
    return returned.length === 0 && pos >= length
  }

  // LESS PATCH {
  function interpolation(start, ignoreUnclosed) {
    let depth = 1
    let stringQuote = 0
    let stringEscaped = false
    let index = start + 2

    for (; index < length; index++) {
      let character = css.charCodeAt(index)
      if (stringQuote) {
        if (!stringEscaped && character === stringQuote) {
          stringQuote = 0
        }
        if (character === BACKSLASH) {
          stringEscaped = !stringEscaped
        } else {
          stringEscaped = false
        }
      } else if (character === BACKSLASH) {
        index++
      } else if (character === SINGLE_QUOTE || character === DOUBLE_QUOTE) {
        stringQuote = character
      } else if (
        (character === AT || character === DOLLAR) &&
        css.charCodeAt(index + 1) === OPEN_CURLY
      ) {
        depth++
        index++
      } else if (character === CLOSE_CURLY && --depth === 0) {
        return index
      }
    }

    if (!ignore && !ignoreUnclosed) {
      throw input.error('Unclosed interpolation', start)
    }
    return length - 1
  }
  // } LESS PATCH

  function nextToken(opts) {
    if (returned.length) return returned.pop()
    if (pos >= length) return
    let ignoreUnclosed = opts ? opts.ignoreUnclosed : false

    code = css.charCodeAt(pos)

    switch (code) {
      case NEWLINE:
      case SPACE:
      case TAB:
      case CR:
      case FEED: {
        next = pos
        do {
          next += 1
          code = css.charCodeAt(next)
        } while (
          code === SPACE ||
          code === NEWLINE ||
          code === TAB ||
          code === CR ||
          code === FEED
        )

        currentToken = ['space', css.slice(pos, next)]
        pos = next - 1
        break
      }

      case OPEN_SQUARE:
      case CLOSE_SQUARE:
      case OPEN_CURLY:
      case CLOSE_CURLY:
      case COLON:
      case SEMICOLON:
      case CLOSE_PARENTHESES: {
        let controlChar = String.fromCharCode(code)
        currentToken = [controlChar, controlChar, pos]
        break
      }

      case OPEN_PARENTHESES: {
        prev = buffer.length ? buffer.pop()[1] : ''
        n = css.charCodeAt(pos + 1)
        // LESS PATCH {
        if (
          prev === 'url' &&
          n !== SINGLE_QUOTE &&
          n !== DOUBLE_QUOTE &&
          n !== SPACE &&
          n !== NEWLINE &&
          n !== TAB &&
          n !== FEED &&
          n !== CR
        ) {
        // } LESS PATCH
          next = pos
          do {
            escaped = false
            next = css.indexOf(')', next + 1)
            if (next === -1) {
              if (ignore || ignoreUnclosed) {
                next = pos
                break
              } else {
                unclosed('bracket')
              }
            }
            escapePos = next
            while (css.charCodeAt(escapePos - 1) === BACKSLASH) {
              escapePos -= 1
              escaped = !escaped
            }
          } while (escaped)

          currentToken = ['brackets', css.slice(pos, next + 1), pos, next]

          pos = next
        } else if (pos <= lastBadParen) {
          currentToken = ['(', '(', pos]
        } else {
          next = css.indexOf(')', pos + 1)
          content = css.slice(pos, next + 1)

          if (next === -1 || RE_BAD_BRACKET.test(content)) {
            lastBadParen = next === -1 ? length : next
            currentToken = ['(', '(', pos]
          } else {
            currentToken = ['brackets', content, pos, next]
            pos = next
          }
        }

        break
      }

      case SINGLE_QUOTE:
      case DOUBLE_QUOTE: {
        quote = code === SINGLE_QUOTE ? "'" : '"'
        next = pos
        do {
          escaped = false
          next = css.indexOf(quote, next + 1)
          if (next === -1) {
            if (ignore || ignoreUnclosed) {
              next = pos + 1
              break
            } else {
              unclosed('string')
            }
          }
          escapePos = next
          while (css.charCodeAt(escapePos - 1) === BACKSLASH) {
            escapePos -= 1
            escaped = !escaped
          }
        } while (escaped)

        currentToken = ['string', css.slice(pos, next + 1), pos, next]
        pos = next
        break
      }

      case AT: {
        // LESS PATCH {
        if (css.charCodeAt(pos + 1) === OPEN_CURLY) {
          next = interpolation(pos, ignoreUnclosed)
          currentToken = ['word', css.slice(pos, next + 1), pos, next]
          pos = next
          break
        }
        // } LESS PATCH
        RE_AT_END.lastIndex = pos + 1
        RE_AT_END.test(css)
        if (RE_AT_END.lastIndex === 0) {
          next = css.length - 1
        } else {
          next = RE_AT_END.lastIndex - 2
        }

        currentToken = ['at-word', css.slice(pos, next + 1), pos, next]
        pos = next
        break
      }

      case BACKSLASH: {
        next = pos
        escape = true
        while (css.charCodeAt(next + 1) === BACKSLASH) {
          next += 1
          escape = !escape
        }
        code = css.charCodeAt(next + 1)
        if (
          escape &&
          code !== SLASH &&
          code !== SPACE &&
          code !== NEWLINE &&
          code !== TAB &&
          code !== CR &&
          code !== FEED
        ) {
          next += 1
          if (RE_HEX_ESCAPE.test(css.charAt(next))) {
            while (RE_HEX_ESCAPE.test(css.charAt(next + 1))) {
              next += 1
            }
            if (css.charCodeAt(next + 1) === SPACE) {
              next += 1
            }
          }
        }

        currentToken = ['word', css.slice(pos, next + 1), pos, next]
        pos = next
        break
      }

      default: {
        // LESS PATCH {
        if (code === DOLLAR && css.charCodeAt(pos + 1) === OPEN_CURLY) {
          next = interpolation(pos, ignoreUnclosed)
          currentToken = ['word', css.slice(pos, next + 1), pos, next]
          pos = next
        } else
        // } LESS PATCH
        if (code === SLASH && css.charCodeAt(pos + 1) === ASTERISK) {
          next = css.indexOf('*/', pos + 2) + 1
          if (next === 0) {
            if (ignore || ignoreUnclosed) {
              next = css.length
            } else {
              unclosed('comment')
            }
          }

          currentToken = ['comment', css.slice(pos, next + 1), pos, next]
          pos = next
        }
        // LESS PATCH {
        else if (code === SLASH && css.charCodeAt(pos + 1) === SLASH) {
          RE_NEW_LINE.lastIndex = pos + 2
          RE_NEW_LINE.test(css)
          next =
            RE_NEW_LINE.lastIndex === 0
              ? css.length - 1
              : RE_NEW_LINE.lastIndex - 2
          currentToken = [
            'comment',
            css.slice(pos, next + 1),
            pos,
            next,
            'inline',
          ]
          pos = next
        }
        // } LESS PATCH
        else {
          RE_WORD_END.lastIndex = pos + 1
          RE_WORD_END.test(css)
          if (RE_WORD_END.lastIndex === 0) {
            next = css.length - 1
          } else {
            next = RE_WORD_END.lastIndex - 2
          }

          currentToken = ['word', css.slice(pos, next + 1), pos, next]
          buffer.push(currentToken)
          pos = next
        }

        break
      }
    }

    pos++
    return currentToken
  }

  function back(token) {
    returned.push(token)
  }

  return {
    back,
    endOfFile,
    nextToken,
    position
  }
}
