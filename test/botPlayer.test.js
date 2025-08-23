import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { runBot } from '../src/botPlayer.js';

const LOG_PATH = 'test/botPlayer.log';

function writeLog(content) {
  fs.writeFileSync(LOG_PATH, content);
}

// deterministic RNG for reproducible tests
function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, seed | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

test('bot plays 100 pieces without errors', () => {
  let result;
  try {
    result = runBot(100, seededRandom(1));
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
