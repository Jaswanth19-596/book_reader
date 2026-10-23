import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConnection, saveConnection, forgetConnection } from '../public/connection.js';

function browserStorage() {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  } });
}

test('connection survives a fresh module load, including the selected model', async () => {
  browserStorage();
  assert.equal(saveConnection({ apiKey: 'test-key', model: 'kimi-k3' }), true);
  const reopened = await import('../public/connection.js?reopened');
  assert.deepEqual(reopened.loadConnection(), { apiKey: 'test-key', model: 'kimi-k3' });
});

test('forgetting a connection leaves saved selections intact', () => {
  browserStorage();
  localStorage.setItem('folio-words', '[{"word":"serendipity"}]');
  saveConnection({ apiKey: 'test-key', model: 'kimi-k3' });
  assert.equal(forgetConnection(), true);
  assert.equal(loadConnection().apiKey, '');
  assert.equal(JSON.parse(localStorage.getItem('folio-words'))[0].word, 'serendipity');
});

test('turning off remember removes a previously saved key', () => {
  browserStorage();
  saveConnection({ apiKey: 'test-key', model: 'kimi-k3' });
  assert.equal(saveConnection({ apiKey: 'new-test-key', model: 'kimi-k3' }, false), true);
  assert.equal(loadConnection().apiKey, '');
});

test('corrupted storage does not break startup, and unsupported stored models fall back', () => {
  browserStorage();
  localStorage.setItem('folio-connection', '{broken');
  assert.deepEqual(loadConnection(), { apiKey: '', model: 'glm-5.3-flash' });
  localStorage.setItem('folio-connection', JSON.stringify({ apiKey: 'test-key', model: 'unknown' }));
  assert.equal(loadConnection().model, 'glm-5.3-flash');
});

test('blocked browser storage reports a failure instead of claiming a key was saved', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  assert.equal(loadConnection().apiKey, '');
  assert.equal(saveConnection({ apiKey: 'test-key', model: 'kimi-k3' }), false);
  assert.equal(forgetConnection(), false);
  delete globalThis.localStorage;
});
