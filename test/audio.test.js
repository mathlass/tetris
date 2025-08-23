import test from 'node:test';
import assert from 'node:assert';
import { createSfx } from '../src/audio.js';

// Test when sound is disabled, AudioContext is never touched and methods no-op

test('createSfx without sound does nothing and avoids AudioContext', () => {
  let constructed = 0;
  const originalWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.window = {
    AudioContext: class { constructor() { constructed++; } },
    webkitAudioContext: class { constructor() { constructed++; } }
  };
  globalThis.setTimeout = (fn) => { fn(); return 0; };

  try {
    const sfx = createSfx({ sound: false });
    assert.doesNotThrow(() => {
      sfx.move();
      sfx.rotate();
      sfx.lock();
      sfx.clear();
      sfx.level();
      sfx.hard();
      sfx.gameover();
    });
    assert.equal(constructed, 0);
  } finally {
    globalThis.window = originalWindow;
    globalThis.setTimeout = originalSetTimeout;
  }
});

// Test logging when AudioContext creation fails

test('createSfx logs error if AudioContext creation throws', () => {
  const originalWindow = globalThis.window;
  const originalConsoleError = console.error;
  const logs = [];
  console.error = (...args) => { logs.push(args); };
  globalThis.window = {
    AudioContext: class { constructor() { throw new Error('fail'); } }
  };

  try {
    const sfx = createSfx({ sound: true });
    assert.doesNotThrow(() => sfx.move());
    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], '[Tetris] Failed to create AudioContext');
    assert.equal(logs[0][1].message, 'fail');
  } finally {
    console.error = originalConsoleError;
    globalThis.window = originalWindow;
  }
});
