import { Parser } from './Parser.js';
import { RegexSyntaxError } from './RegexSyntaxError.js';
import { Searcher } from './Searcher.js';
import { MatchLimitError } from './Matcher.js';
import { InputValidator } from './InputValidator.js';
import { Highlighter } from './Highlighter.js';

const expressionInput = document.getElementById('expression-input');
const textInput = document.getElementById('text-input');
const checkButton = document.getElementById('check-button');
const statusBox = document.getElementById('status');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');

function showStatus(type, message, details) {
  statusBox.className = `status status--${type}`;
  statusBox.textContent = message;

  if (details) {
    statusBox.appendChild(details);
  }

  statusBox.hidden = false;
}

function hideResult() {
  resultSection.hidden = true;
  resultText.textContent = '';
}

function matchesWord(count) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return 'совпадений';
  if (last === 1) return 'совпадение';
  if (last >= 2 && last <= 4) return 'совпадения';
  return 'совпадений';
}

function check() {
  hideResult();

  const expression = expressionInput.value;
  const text = textInput.value;

  const inputErrors = InputValidator.validate(expression, text);
  if (inputErrors.length > 0) {
    showStatus('warning', inputErrors.join(' '));
    return;
  }

  let tree;
  try {
    tree = new Parser(expression).parse();
  } catch (error) {
    if (error instanceof RegexSyntaxError) {
      const details = document.createElement('pre');
      details.className = 'status__details';
      Highlighter.renderError(details, expression, error.position);

      showStatus('warning', `Введено не регулярное выражение. ${error.message}`, details);
      return;
    }
    throw error;
  }

  let matches;
  try {
    matches = new Searcher(tree).findAll(text);
  } catch (error) {
    if (error instanceof MatchLimitError) {
      showStatus('warning', error.message);
      return;
    }
    throw error;
  }

  if (matches.length === 0) {
    showStatus('info', 'Выражение корректно, но в тексте оно не найдено.');
    return;
  }

  showStatus('success', `Выражение корректно. Найдено: ${matches.length} ${matchesWord(matches.length)}.`);
  Highlighter.render(resultText, text, matches);
  resultSection.hidden = false;
}

checkButton.addEventListener('click', check);

expressionInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    check();
  }
});