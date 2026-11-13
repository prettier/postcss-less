import Comment from 'postcss/lib/comment';
import Parser from 'postcss/lib/parser';

import { isInlineComment } from './nodes/inline-comment.js';
import {
  isInterpolation,
  mergeParamsInterpolation,
} from './nodes/interpolation.js';
import { isMixinToken } from './nodes/mixin.js';
import { convertImport } from './nodes/import.js';
import { convertVariable } from './nodes/variable.js';

const importantPattern = /(!\s*important)$/i;

export class LessParser extends Parser {
  constructor(...arguments_) {
    super(...arguments_);

    this.lastNode = null;
  }

  atrule(token) {
    if (isInterpolation(this, token)) {
      return;
    }

    mergeParamsInterpolation(this);

    super.atrule(token);
    convertImport(this.lastNode);
    convertVariable(this.lastNode);
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
    // prepend a space so the `name` will be parsed correctly
    tokens[0][1] = ` ${tokens[0][1]}`;

    const bracketsIndex = tokens.findIndex((t) => t[0] === 'brackets');
    let params;

    if (bracketsIndex > 0) {
      params = tokens.splice(bracketsIndex, 1)[0][1];
    } else {
      const firstOpeningParenthesisIndex = tokens.findIndex(
        (token) => token[0] === '(',
      );
      const lastClosingParenthesisIndex = tokens.reduce(
        (last, token, index) => (token[0] === ')' ? index : last),
        -1,
      );
      const paramTokens = tokens.splice(
        firstOpeningParenthesisIndex,
        lastClosingParenthesisIndex - firstOpeningParenthesisIndex + 1,
      );
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

  other(token) {
    if (!isInlineComment(this, token)) {
      super.other(token);
    }
  }

  rule(tokens) {
    const lastToken = tokens[tokens.length - 1];
    const penultimateToken = tokens[tokens.length - 2];

    if (penultimateToken[0] === 'at-word' && lastToken[0] === '{') {
      this.tokenizer.back(lastToken);
      if (isInterpolation(this, penultimateToken)) {
        const newToken = this.tokenizer.nextToken();

        tokens = tokens.slice(0, tokens.length - 2).concat([newToken]);

        for (const token of tokens.reverse()) {
          this.tokenizer.back(token);
        }

        return;
      }
    }

    super.rule(tokens);

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

    // TODO: move this into a util function/file
    if (isMixinToken(firstToken)) {
      this.mixin(tokens);
      return;
    }

    if (firstToken[0] === 'word') {
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
