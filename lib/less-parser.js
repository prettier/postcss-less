import Comment from 'postcss/lib/comment';
import Parser from 'postcss/lib/parser';

import tokenize from './less-tokenize.js';
import { convertImport } from './nodes/import.js';

const importantPattern = /(!\s*important)$/i;

class LessParser extends Parser {
  constructor(...arguments_) {
    super(...arguments_);

    this.lastNode = null;
  }

  comment(token) {
    if (token[4] === 'inline') {
      this.inlineComment(token);
    } else {
      super.comment(token);
    }
  }

  createTokenizer() {
    this.tokenizer = tokenize(this.input);
  }

  atrule(token) {
    if (token[4] !== 'variable') {
      this.prepareAtRuleTokens();
    }

    super.atrule(token);
    convertImport(this.lastNode);
    if (token[4] === 'variable') {
      this.lastNode.name = this.lastNode.name.slice(0, -1);
      this.lastNode.variable = true;
      const { raws } = this.lastNode;
      const leading = this.lastNode.params ? raws.afterName : raws.between;
      const comment = leading.match(/^([ \t\n\r\f]*)(\/[/*][^]*)$/);
      if (comment) {
        raws.afterName = comment[1];
        if (!this.lastNode.params) {
          raws.between = '';
        }
      }
      raws.afterName = `:${raws.afterName || ''}`;
      this.lastNode.params =
        (comment ? comment[2] : '') +
        (raws.params ? raws.params.raw : this.lastNode.params);
      this.lastNode.value = this.lastNode.params;
    }
  }

  decl(...arguments_) {
    super.decl(...arguments_);

    // #123: add `extend` decorator to nodes
    const extendPattern = /extend\(.+\)/i;

    if (extendPattern.test(this.lastNode.value)) {
      this.lastNode.extend = true;
    }
  }

  functionCall(tokens) {
    const [firstToken, secondToken] = tokens;
    // prepend a space so the `name` will be parsed correctly
    firstToken[1] = ` ${firstToken[1]}`;

    let params;

    if (secondToken[0] === 'brackets') {
      params = secondToken[1];
      tokens.splice(1, 1);
    } else {
      const closingParenthesisIndex = tokens.reduce(
        (last, token, index) => (token[0] === ')' ? index : last),
        -1,
      );

      const paramTokens = tokens.splice(1, closingParenthesisIndex);
      params = paramTokens.map((token) => token[1]).join('');
    }

    for (const token of tokens.reverse()) {
      this.tokenizer.back(token);
    }

    this.atrule(this.tokenizer.nextToken());
    this.lastNode.function = true;
    this.lastNode.params = params;
  }

  init(node, line, column) {
    super.init(node, line, column);
    this.lastNode = node;
  }

  inlineComment(token) {
    const node = new Comment();
    const text = token[1].slice(2);

    this.init(node, token[2]);
    node.source.end = this.getPosition(token[3] || token[2]);
    node.source.end.offset++;
    node.inline = true;
    node.raws.begin = '//';

    if (/^\s*$/.test(text)) {
      node.text = '';
      node.raws.left = text;
      node.raws.right = '';
    } else {
      const match = text.match(/^(\s*)([^]*[^\s])(\s*)$/);
      [, node.raws.left, node.text, node.raws.right] = match;
    }
  }

  mixin(tokens) {
    const [firstToken] = tokens;

    if (firstToken[1] === '.' || firstToken[1] === '#') {
      const secondToken = tokens[1];

      if (secondToken?.[0] === 'word' && secondToken[1].startsWith('\\')) {
        firstToken[1] += secondToken[1];
        firstToken[3] = secondToken[3];
        tokens.splice(1, 1);
      }
    }

    const identifier = firstToken[1].slice(0, 1);
    const bracketsIndex = tokens.findIndex((token) => token[0] === 'brackets');
    const firstOpeningParenthesisIndex = tokens.findIndex(
      (token) => token[0] === '(',
    );
    let important = '';

    // fix for #86. if rulesets are mixin params, they need to be converted to a brackets token
    if (
      (bracketsIndex < 0 || bracketsIndex > 3) &&
      firstOpeningParenthesisIndex > 0
    ) {
      const lastClosingParenthesisIndex = tokens.reduce((last, token, index) =>
        token[0] === ')' ? index : last,
      );

      const contents = tokens.slice(
        firstOpeningParenthesisIndex,
        lastClosingParenthesisIndex + firstOpeningParenthesisIndex,
      );
      const brackets = contents.map((token) => token[1]).join('');
      const [openingParenthesis] = tokens.slice(firstOpeningParenthesisIndex);
      const start = [openingParenthesis[2], openingParenthesis[3]];
      const [lastToken] = tokens.slice(
        lastClosingParenthesisIndex,
        lastClosingParenthesisIndex + 1,
      );
      const end = [lastToken[2], lastToken[3]];
      const newToken = ['brackets', brackets].concat(start, end);

      const tokensBefore = tokens.slice(0, firstOpeningParenthesisIndex);
      const tokensAfter = tokens.slice(lastClosingParenthesisIndex + 1);
      tokens = tokensBefore;
      tokens.push(newToken);
      tokens = tokens.concat(tokensAfter);
    }

    const importantTokens = [];

    for (const token of tokens) {
      if (token[1] === '!' || importantTokens.length) {
        importantTokens.push(token);
      }

      if (token[1] === 'important') {
        break;
      }
    }

    if (importantTokens.length) {
      const [bangToken] = importantTokens;
      const bangIndex = tokens.indexOf(bangToken);
      const lastToken = importantTokens[importantTokens.length - 1];
      const start = [bangToken[2], bangToken[3]];
      const end = [lastToken[4], lastToken[5]];
      const combined = importantTokens.map((token) => token[1]).join('');
      const newToken = ['word', combined].concat(start, end);
      tokens.splice(bangIndex, importantTokens.length, newToken);
    }

    const importantIndex = tokens.findIndex((token) =>
      importantPattern.test(token[1]),
    );

    if (importantIndex > 0) {
      [, important] = tokens[importantIndex];
      tokens.splice(importantIndex, 1);
    }

    for (const token of tokens.reverse()) {
      this.tokenizer.back(token);
    }

    this.atrule(this.tokenizer.nextToken());
    this.lastNode.mixin = true;
    this.lastNode.raws.identifier = identifier;

    if (important) {
      this.lastNode.important = true;
      this.lastNode.raws.important = important;
    }
  }

  prepareAtRuleTokens() {
    const tokens = [];
    let token = this.tokenizer.nextToken();

    while (token) {
      if (token[0] === 'comment' && token[4] === 'inline') {
        token = ['word', ...token.slice(1, 4)];
      }
      tokens.push(token);
      if (token[0] === '{' || token[0] === '}' || token[0] === ';') {
        break;
      }
      token = this.tokenizer.nextToken();
    }

    for (const token of tokens.reverse()) {
      this.tokenizer.back(token);
    }
  }

  rule(tokens) {
    super.rule(tokens);

    // TODO[@fisker]: Drop comments inside selector like PostCSS does
    const node = this.lastNode;
    if (
      node.raws.selector &&
      node.raws.selector.value !== node.raws.selector.raw
    ) {
      node.selector = node.raws.selector.raw;
    }

    // #123: add `extend` decorator to nodes
    const extendPattern = /:extend\(.+\)/i;

    if (extendPattern.test(this.lastNode.selector)) {
      this.lastNode.extend = true;
    }
  }

  unknownWord(tokens) {
    // NOTE: keep commented for examining unknown structures
    // console.log('unknown', tokens);

    const [firstToken] = tokens;

    if (firstToken[0] === 'word') {
      if (firstToken[1].startsWith('.') || firstToken[1].startsWith('#')) {
        this.mixin(tokens);
        return;
      }

      const secondToken = tokens[1];
      if (
        secondToken &&
        (secondToken[0] === '(' || secondToken[0] === 'brackets')
      ) {
        this.functionCall(tokens);
        return;
      }
    }

    super.unknownWord(tokens);
  }
}

export default LessParser;
