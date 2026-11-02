import { RegexSyntaxError } from './RegexSyntaxError.js';
import {
  CharNode,
  AnyNode,
  ClassNode,
  StartNode,
  EndNode,
  GroupNode,
  SequenceNode,
  AlternationNode,
  RepeatNode,
} from './nodes.js';

function isAlphanumeric(char) {
  return (
    (char >= '0' && char <= '9') ||
    (char >= 'a' && char <= 'z') ||
    (char >= 'A' && char <= 'Z')
  );
}

function isQuantifier(char) {
  return char === '*' || char === '+' || char === '?';
}

export class Parser {
  constructor(expression) {
    this.expression = expression;
    this.pos = 0;
  }

  parse() {
    if (this.expression.length === 0) {
      throw new RegexSyntaxError('выражение пустое', 0);
    }

    const tree = this._parseAlternation();

    if (this.pos < this.expression.length) {
      throw new RegexSyntaxError('лишняя закрывающая скобка', this.pos);
    }

    return tree;
  }

  _peek() {
    return this.expression.charAt(this.pos);
  }

  _parseAlternation() {
    const options = [];

    while (true) {
      const sequence = this._parseSequence();

      if (sequence.items.length === 0) {
        throw new RegexSyntaxError('пустая ветка выбора', this.pos);
      }

      options.push(sequence);

      if (this._peek() === '|') {
        this.pos++;
      } else {
        break;
      }
    }

    return options.length === 1 ? options[0] : new AlternationNode(options);
  }

  _parseSequence() {
    const items = [];

    while (true) {
      const char = this._peek();

      if (char === '' || char === '|' || char === ')') {
        break;
      }

      items.push(this._parseQuantified());
    }

    return new SequenceNode(items);
  }

  _parseQuantified() {
    const first = this._peek();

    if (isQuantifier(first)) {
      throw new RegexSyntaxError(`повтор «${first}» без предыдущего элемента`, this.pos);
    }

    const atom = this._parseAtom();
    const next = this._peek();

    if (!isQuantifier(next)) {
      return atom;
    }

    if (atom.type === 'start' || atom.type === 'end') {
      throw new RegexSyntaxError(`повтор «${next}» нельзя применять к якорю`, this.pos);
    }

    this.pos++;

    if (isQuantifier(this._peek())) {
      throw new RegexSyntaxError(
        `двойной повтор «${next}${this._peek()}» не поддерживается`,
        this.pos
      );
    }

    if (next === '*') return new RepeatNode(atom, 0, Infinity);
    if (next === '+') return new RepeatNode(atom, 1, Infinity);
    return new RepeatNode(atom, 0, 1);
  }

  _parseAtom() {
    const char = this._peek();

    if (char === '(') return this._parseGroup();
    if (char === '[') return this._parseClass();

    if (char === '.') {
      this.pos++;
      return new AnyNode();
    }

    if (char === '^') {
      this.pos++;
      return new StartNode();
    }

    if (char === '$') {
      this.pos++;
      return new EndNode();
    }

    if (char === '\\') {
      return new CharNode(this._readEscaped('в конце выражения стоит одинокая «\\»'));
    }

    if (char === '{' || char === '}') {
      throw new RegexSyntaxError(
        `символ «${char}» не поддерживается (счётчики {n,m} не входят в набор)`,
        this.pos
      );
    }

    if (char === ']') {
      throw new RegexSyntaxError('«]» без открывающей «[» (для символа используйте «\\]»)', this.pos);
    }

    this.pos++;
    return new CharNode(char);
  }

  _parseGroup() {
    const openPos = this.pos;
    this.pos++;

    if (this._peek() === ')') {
      throw new RegexSyntaxError('пустая группа', openPos);
    }

    const inner = this._parseAlternation();

    if (this._peek() !== ')') {
      throw new RegexSyntaxError('не закрыта скобка «(»', openPos);
    }

    this.pos++;
    return new GroupNode(inner);
  }

  _readEscaped(trailingMessage) {
    const slashPos = this.pos;
    this.pos++;

    if (this.pos >= this.expression.length) {
      throw new RegexSyntaxError(trailingMessage, slashPos);
    }

    const escaped = this._peek();

    if (isAlphanumeric(escaped)) {
      throw new RegexSyntaxError(
        `последовательность «\\${escaped}» не поддерживается (экранировать можно только знаки)`,
        slashPos
      );
    }

    this.pos++;
    return escaped;
  }

  _parseClass() {
    const openPos = this.pos;
    this.pos++;

    let negated = false;
    if (this._peek() === '^') {
      negated = true;
      this.pos++;
    }

    const ranges = [];

    while (true) {
      if (this.pos >= this.expression.length) {
        throw new RegexSyntaxError('не закрыта скобка «[»', openPos);
      }

      if (this._peek() === ']') {
        if (ranges.length === 0) {
          throw new RegexSyntaxError('пустой класс символов (для символа используйте «\\]»)', openPos);
        }
        this.pos++;
        break;
      }

      const itemPos = this.pos;
      const from = this._readClassChar(openPos);
      const afterFrom = this.expression.charAt(this.pos);
      const afterDash = this.expression.charAt(this.pos + 1);

      if (afterFrom === '-' && afterDash !== ']' && afterDash !== '') {
        this.pos++;
        const to = this._readClassChar(openPos);

        if (from > to) {
          throw new RegexSyntaxError(`неверный диапазон «${from}-${to}»`, itemPos);
        }

        ranges.push({ from, to });
      } else {
        ranges.push({ from, to: from });
      }
    }

    return new ClassNode(ranges, negated);
  }

  _readClassChar(openPos) {
    if (this.pos >= this.expression.length) {
      throw new RegexSyntaxError('не закрыта скобка «[»', openPos);
    }

    if (this._peek() === '\\') {
      return this._readEscaped('в конце выражения стоит одинокая «\\»');
    }

    const char = this._peek();
    this.pos++;
    return char;
  }
}