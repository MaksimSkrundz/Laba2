import { Parser } from './Parser.js';
import { Searcher } from './Searcher.js';
import { RegexSyntaxError } from './RegexSyntaxError.js';
import { MatchLimitError } from './Matcher.js';


let passed = 0;
let failed = 0;

function short(value) {
  const text = JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function report(ok, title, details) {
  if (ok) {
    passed++;
    console.log(`ok    ${title}`);
  } else {
    failed++;
    console.log(`FAIL  ${title}\n        ${details}`);
  }
}

function search(expression, text) {
  const tree = new Parser(expression).parse();
  return new Searcher(tree).findAll(text).map(({ start, end }) => text.slice(start, end));
}


const searchCases = [
  ['abc', 'xabcxabc', ['abc', 'abc']],
  ['кот', 'кот и котёнок', ['кот', 'кот']],
  ['c.t', 'cat cut c-t ct', ['cat', 'cut', 'c-t']],

  ['ab*c', 'ac abc abbbc adc', ['ac', 'abc', 'abbbc']],
  ['ab+c', 'ac abc abbbc', ['abc', 'abbbc']],
  ['colou?r', 'color colour colouur', ['color', 'colour']],

  ['cat|dog', 'cat, dog, cow', ['cat', 'dog']],
  ['(ab)+', 'ab abab aab', ['ab', 'abab', 'ab']],
  ['gr(a|e)y', 'gray grey groy', ['gray', 'grey']],

  ['[0-9]+', 'Заказ 15, 2 места, 2026', ['15', '2', '2026']],
  ['[^ ]+', 'раз два  три', ['раз', 'два', 'три']],
  ['[a-zA-Z]+', 'Hello, Мир! abc', ['Hello', 'abc']],
  ['[a-]+', 'a-a b', ['a-a']],
  ['[\\]x]+', ']x] y', [']x]']],

  ['^abc', 'abc abc', ['abc']],
  ['abc$', 'abc abc', ['abc']],
  ['^abc$', 'abc', ['abc']],
  ['^abc$', 'abc abc', []],

  ['3\\+4', '3+4=7, 3+5', ['3+4']],
  ['\\(\\)', 'f() g()', ['()', '()']],

  ['a*ab', 'aaab', ['aaab']],
  ['(a|b)*c', 'abbac', ['abbac']],

  ['a|ab|abc', 'abc', ['abc']],
  ['(a|ab)(c|bcd)', 'abcd', ['abcd']],
  ['x*|a', 'a x a', ['a', 'x', 'a']],

  ['a*', 'baaac', ['aaa']],

  ['xyz', 'hello', []],

  ['.+', 'one\ntwo', ['one', 'two']],

  ['[0-2][0-9]:[0-5][0-9]', 'в 09:30 и 23:59', ['09:30', '23:59']],
  ['[a-z]+@[a-z]+\\.[a-z]+', 'mail@site.com, bob@host.org', ['mail@site.com', 'bob@host.org']],

  ['[a-z]+', 'a'.repeat(20000), ['a'.repeat(20000)]],
];

for (const [expression, text, expected] of searchCases) {
  const title = `${short(expression)} в ${short(text)}`;

  try {
    const actual = search(expression, text);
    report(
      JSON.stringify(actual) === JSON.stringify(expected),
      title,
      `ожидали ${short(expected)}, получили ${short(actual)}`
    );
  } catch (error) {
    report(false, title, `неожиданная ошибка: ${error.message}`);
  }
}


const errorCases = [
  ['', 0],
  ['(ab', 0],
  ['ab)', 2],
  ['*a', 0],
  ['+', 0],
  ['a|*', 2],
  ['a**', 2],
  ['a+*', 2],
  ['a||b', 2],
  ['|a', 0],
  ['a|', 2],
  ['()', 0],
  ['(a|)', 3],
  ['[abc', 0],
  ['[]', 0],
  ['[z-a]', 1],
  ['abc\\', 3],
  ['\\d+', 0],
  ['a{2}', 1],
  [']', 0],
  ['^*', 1],
];

for (const [expression, expectedPosition] of errorCases) {
  const title = `ошибка в ${short(expression)}`;

  try {
    search(expression, 'x');
    report(false, title, 'ожидали ошибку, а выражение приняли');
  } catch (error) {
    if (!(error instanceof RegexSyntaxError)) {
      report(false, title, `ошибка другого вида: ${error.message}`);
    } else {
      report(
        error.position === expectedPosition,
        `${title} (позиция ${expectedPosition})`,
        `ожидали позицию ${expectedPosition}, получили ${error.position}`
      );
    }
  }
}


try {
  search('(a*)*b', 'a'.repeat(30));
  report(false, 'слишком сложное выражение', 'ожидали остановку по лимиту шагов');
} catch (error) {
  report(
    error instanceof MatchLimitError,
    'слишком сложное выражение останавливается',
    `ожидали MatchLimitError, получили ${error.name}`
  );
}

console.log(`\nВсего: ${passed + failed}, успешно: ${passed}, с ошибкой: ${failed}`);
process.exit(failed === 0 ? 0 : 1);