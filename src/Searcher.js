import { Matcher } from './Matcher.js';

export class Searcher {
  constructor(tree) {
    this.tree = tree;
  }

  findAll(text) {
    const matcher = new Matcher(this.tree);
    const matches = [];
    let pos = 0;

    while (pos < text.length) {
      const end = matcher.matchAt(text, pos);

      if (end !== -1) {
        matches.push({ start: pos, end });
        pos = end;
      } else {
        pos++;
      }
    }

    return matches;
  }
}