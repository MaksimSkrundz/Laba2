// Здесь "детали конструктора" для схемы выражения.
// Парсер собирает из них дерево, а Matcher потом по нему идёт.
// Никакой логики поиска тут нет, только хранение данных.

// обычный символ, например "a"
export class CharNode {
  constructor(value) {
    this.type = 'char';
    this.value = value;
  }
}

export class AnyNode {
  constructor() {
    this.type = 'any';
  }
}

export class ClassNode {
  constructor(ranges, negated) {
    this.type = 'class';
    this.ranges = ranges;
    this.negated = negated;
  }

  matches(char) {
    let found = false;

    for (const range of this.ranges) {
      if (char >= range.from && char <= range.to) {
        found = true;
        break;
      }
    }

    return this.negated ? !found : found;
  }
}

export class StartNode {
  constructor() {
    this.type = 'start';
  }
}

export class EndNode {
  constructor() {
    this.type = 'end';
  }
}

export class GroupNode {
  constructor(child) {
    this.type = 'group';
    this.child = child;
  }
}

export class SequenceNode {
  constructor(items) {
    this.type = 'sequence';
    this.items = items;
  }
}

export class AlternationNode {
  constructor(options) {
    this.type = 'alternation';
    this.options = options;
  }
}

export class RepeatNode {
  constructor(child, min, max) {
    this.type = 'repeat';
    this.child = child;
    this.min = min;
    this.max = max;
  }
}