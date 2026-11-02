export class MatchLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MatchLimitError';
  }
}

const MAX_STEPS = 10_000_000;

export class Matcher {
  constructor(tree) {
    this.tree = tree;
    this._steps = 0;
  }

  matchAt(text, start) {
    let best = -1;

    try {
      this._match(this.tree, text, start, (end) => {
        if (end <= start) return -1;

        if (end > best) best = end;

        return end === text.length ? end : -1;
      });

      return best;
    } catch (error) {
      if (error instanceof RangeError) {
        throw new MatchLimitError('Текст слишком длинный для такого выражения.');
      }
      throw error;
    }
  }

  _tick() {
    this._steps++;
    if (this._steps > MAX_STEPS) {
      throw new MatchLimitError('Выражение слишком сложное: поиск занимает слишком много шагов.');
    }
  }

  _matchesOne(node, text, pos) {
    if (pos >= text.length) return false;

    const char = text.charAt(pos);

    if (node.type === 'char') return char === node.value;
    if (node.type === 'any') return char !== '\n';
    return node.matches(char);
  }

  _match(node, text, pos, next) {
    this._tick();

    switch (node.type) {
      case 'char':
        return pos < text.length && text.charAt(pos) === node.value ? next(pos + 1) : -1;

      case 'any':
        return pos < text.length && text.charAt(pos) !== '\n' ? next(pos + 1) : -1;

      case 'class':
        return pos < text.length && node.matches(text.charAt(pos)) ? next(pos + 1) : -1;

      case 'start':
        return pos === 0 ? next(pos) : -1;

      case 'end':
        return pos === text.length ? next(pos) : -1;

      case 'group':
        return this._match(node.child, text, pos, next);

      case 'sequence':
        return this._matchSequence(node.items, 0, text, pos, next);

      case 'alternation':
        return this._matchAlternation(node.options, text, pos, next);

      case 'repeat':
        return this._matchRepeat(node, text, pos, 0, next);

      default:
        throw new Error(`Неизвестный тип узла: ${node.type}`);
    }
  }

  _matchSequence(items, index, text, pos, next) {
    if (index === items.length) {
      return next(pos);
    }

    return this._match(items[index], text, pos, (nextPos) =>
      this._matchSequence(items, index + 1, text, nextPos, next)
    );
  }

  _matchAlternation(options, text, pos, next) {
    for (const option of options) {
      const result = this._match(option, text, pos, next);
      if (result !== -1) {
        return result;
      }
    }
    return -1;
  }

  _matchRepeat(node, text, pos, count, next) {
    const childType = node.child.type;

    if (childType === 'char' || childType === 'any' || childType === 'class') {
      let available = 0;
      while (available < node.max && this._matchesOne(node.child, text, pos + available)) {
        available++;
      }

      for (let taken = available; taken >= node.min; taken--) {
        this._tick();
        const result = next(pos + taken);
        if (result !== -1) {
          return result;
        }
      }

      return -1;
    }

    if (count < node.max) {
      const result = this._match(node.child, text, pos, (nextPos) => {
        if (nextPos === pos) {
          return next(nextPos);
        }
        return this._matchRepeat(node, text, nextPos, count + 1, next);
      });

      if (result !== -1) {
        return result;
      }
    }

    return count >= node.min ? next(pos) : -1;
  }
}