import test from 'node:test';
import assert from 'node:assert/strict';
import meaning, { config } from '../netlify/functions/meaning.mjs';

const payload = { word: 'serendipity', context: '', apiKey: 'test-key', model: 'kimi-k3', session: 'test-session' };
const request = (data = payload, origin = 'https://folio.example') => new Request('https://folio.example/api/meaning', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(data)
});

test('Netlify exposes the route used by the reader', () => {
  assert.equal(config.path, '/api/meaning');
});

test('rejects wrong methods, other website origins, missing keys, and unsupported models', async () => {
  assert.equal((await meaning(new Request('https://folio.example/api/meaning'))).status, 405);
  assert.equal((await meaning(request(payload, 'https://another.example'))).status, 403);
  assert.equal((await meaning(request({ ...payload, apiKey: '' }))).status, 401);
  assert.equal((await meaning(request({ ...payload, model: 'unknown' }))).status, 400);
});

test('forwards a browser-supplied key and returns an explanation without leaking it', async t => {
  let call;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    call = { url, options };
    return Response.json({ choices: [{ message: { content: JSON.stringify({ kind: 'word', meaning: 'A lucky discovery.', context: 'A useful surprise.', partOfSpeech: 'noun', examples: ['A chance discovery.'] }) } }] });
  });
  const response = await meaning(request());
  assert.equal(response.status, 200);
  assert.equal(call.options.headers.Authorization, 'Bearer test-key');
  assert.equal(call.url, 'https://opencode.ai/inference/go/openai/v1/chat/completions');
  assert.equal(JSON.parse(call.options.body).messages[1].content, JSON.stringify({ selection: payload.word, excerpt: '' }));
  const text = await response.text();
  assert.equal(JSON.parse(text).meaning, 'A lucky discovery.');
  assert.equal(text.includes(payload.apiKey), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('provider rejection and invalid output produce useful errors', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 401 }));
  let response = await meaning(request());
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /rejected the API key/);
  mock.mock.mockImplementation(async () => Response.json({ choices: [{ message: { content: 'not JSON' } }] }));
  response = await meaning(request());
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /usable explanation/);
});
