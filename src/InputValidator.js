export class InputValidator {
  static validate(expression, text) {
    const errors = [];

    if (expression.length === 0) {
      errors.push('Введите выражение: поле выражения пустое.');
    }

    if (text.length === 0) {
      errors.push('Введите текст: строка для поиска пустая.');
    }

    return errors;
  }
}