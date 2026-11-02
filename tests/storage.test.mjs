import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudSelections, parseBackup, readLegacy, validateSelections } from '../public/storage.js';
const item = { word: 'serendipity', meaning: 'A happy discovery', examples: ['Example'] };

test('backup round trip preserves content but excludes credentials and server metadata', () => {
  const selections = validateSelections([{ ...item, apiKey: 'secret', user_id: 'other', cloudId: 'old' }]);
  assert.equal(selections[0].apiKey, undefined);
  assert.equal(selections[0].user_id, undefined);
  assert.deepEqual(parseBackup(JSON.stringify({ format: 'folio-selections', version: 1, selections })), selections);
  assert.equal(parseBackup(JSON.stringify([item]))[0].word, item.word);
});

test('invalid backups fail before any writes', () => {
  for (const value of [null, {}, [{ word: 7 }], [{ ...item, examples: 'invalid' }], [{ ...item, context: {} }]]) {
    assert.throws(() => validateSelections(value));
  }
  assert.throws(() => parseBackup('{broken'));
  assert.throws(() => parseBackup('{"format":"other","version":1,"selections":[]}'));
});

test('legacy import does not alter or remove original browser storage', () => {
  let reads = 0;
  const result = readLegacy({ getItem(key) { assert.equal(key, 'folio-words'); reads++; return JSON.stringify([item]); } });
  assert.equal(reads, 1); assert.equal(result[0].word, item.word);
  assert.throws(() => readLegacy({ getItem() { return 'corrupted'; } }));
});

test('saves use account ownership and stable IDs; import never overwrites cloud rows', async () => {
  const writes = [];
  const client = { from(name) { assert.equal(name, 'folio_selections'); return { async upsert(rows, options) { writes.push({ rows, options }); return { error: null }; } }; } };
  const store = new CloudSelections(client, 'user-one');
  await store.save([item]); await store.save([{ ...item, meaning: 'changed' }]);
  assert.equal(writes[0].rows[0].id, writes[1].rows[0].id);
  assert.match(writes[0].rows[0].id, /^[0-9a-f]{64}$/);
  assert.equal(writes[0].rows[0].user_id, 'user-one');
  assert.equal(writes[0].options.ignoreDuplicates, true);
});

test('save failures propagate instead of reporting success', async () => {
  const store = new CloudSelections({ from() { return { async upsert() { return { error: Error('Offline') }; } }; } }, 'u');
  await assert.rejects(store.save([item]), /Offline/);
});

test('pagination retrieves more than the API row limit and scopes every request', async () => {
  let calls = 0;
  const query = {
    select() { return this; }, eq(key, value) { assert.equal(key, 'user_id'); assert.equal(value, 'owner'); return this; },
    order(key) { assert.equal(key, 'id'); return this; },
    async range(start, end) { calls++; assert.equal(end - start, 499); return { data: Array.from({ length: start === 0 ? 500 : 3 }, (_, i) => ({ id: start + i })), error: null }; }
  };
  const store = new CloudSelections({ from() { return query; } }, 'owner');
  assert.equal((await store.list()).length, 503); assert.equal(calls, 2);
});

test('archive and restore only update deletion timestamp and require an acknowledged row', async () => {
  const updates = [], filters = [];
  let count = 1;
  const query = {
    update(value) { updates.push(value); return this; },
    eq(...args) { filters.push(args); return this; },
    async select() { return { data: count ? [{ id: 'id' }] : [], error: null }; }
  };
  const store = new CloudSelections({ from() { return query; } }, 'owner');
  await store.archive('id'); await store.archive('id', false);
  assert.deepEqual(Object.keys(updates[0]), ['deleted_at']);
  assert.equal(updates[1].deleted_at, null);
  assert.deepEqual(filters.slice(0, 2), [['user_id', 'owner'], ['id', 'id']]);
  count = 0; await assert.rejects(store.archive('id'), /not updated/);
});
