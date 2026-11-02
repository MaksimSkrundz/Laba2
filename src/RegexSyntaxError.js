export class RegexSyntaxError extends Error {
  constructor(reason, position) {
    super(`Позиция ${position + 1}: ${reason}`);
    this.name = 'RegexSyntaxError';
    this.reason = reason;
    this.position = position;
  }
}