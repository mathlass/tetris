import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { runBot } from '../src/botPlayer.js';

const LOG_PATH = 'test/botPlayer.log';

function writeLog(content) {
  fs.writeFileSync(LOG_PATH, content);
}

test('bot plays 100 pieces without errors', () => {
  let result;
  try {
    result = runBot(100);
  } catch (err) {
    writeLog(`Exception: ${err.stack}`);
    throw err;
  }
  writeLog(result.logs.join('\n'));
  if (result.errors.length) {
    fs.appendFileSync(LOG_PATH, '\nErrors:\n' + result.errors.join('\n'));
  }
  assert.equal(result.pieces, 100);
  assert.equal(result.errors.length, 0, `Errors:\n${result.errors.join('\n')}`);
  assert.ok(result.linesCleared >= 0 && result.linesCleared <= result.pieces * 4,
    `Unexpected line count: ${result.linesCleared}`);
});
