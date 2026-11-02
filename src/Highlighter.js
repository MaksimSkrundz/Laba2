export class Highlighter {
  static render(container, text, matches) {
    container.textContent = '';

    let cursor = 0;

    for (const { start, end } of matches) {
      if (start > cursor) {
        container.appendChild(document.createTextNode(text.slice(cursor, start)));
      }

      const mark = document.createElement('mark');
      mark.textContent = text.slice(start, end);
      container.appendChild(mark);

      cursor = end;
    }

    if (cursor < text.length) {
      container.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  static renderError(container, expression, position) {
    container.textContent = '';

    container.appendChild(document.createTextNode(expression.slice(0, position)));

    const mark = document.createElement('mark');
    mark.className = 'bad';
    mark.textContent = position < expression.length ? expression.charAt(position) : '\u00a0';
    container.appendChild(mark);

    container.appendChild(document.createTextNode(expression.slice(position + 1)));
  }
}