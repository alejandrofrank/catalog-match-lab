import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewWithJev } from '../src/jev.js';
test('provider integration sends bounded structured questions and validates choices', async () => {
  let payload;
  const result = await reviewWithJev([{ request: 'a', candidate: 'b' }], { apiKey: 'test-placeholder', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone'); assert.equal(options.redirect, 'error');
    payload = JSON.parse(options.body);
    return { ok: true, async json() { return { answers: { p0: { type: 'choice', choice: 'yes', confidence: 0.9 } }, model: 'test-model', usage: { input_tokens: 10 } }; } };
  } });
  assert.equal(payload.questions.p0.type, 'choice'); assert.equal(result.answers[0].decision, 'yes'); assert.equal(result.inputTokens, 10);
});
test('missing answers remain errors rather than fabricated matches', async () => {
  const result = await reviewWithJev([{ request: 'a', candidate: 'b' }], { apiKey: 'test-placeholder', fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal(result.answers[0].decision, 'error'); assert.equal(result.inputTokens, null);
});
test('missing key, oversized batches and provider errors are surfaced', async () => {
  await assert.rejects(reviewWithJev([{ request: 'a', candidate: 'b' }]), /JEV_API_KEY/);
  await assert.rejects(reviewWithJev(Array(33).fill({ request: 'a', candidate: 'b' }), { apiKey: 'test-placeholder' }), /bounded/);
  await assert.rejects(reviewWithJev([{ request: 'a', candidate: 'b' }], { apiKey: 'test-placeholder', fetchImpl: async () => ({ ok: false, status: 429 }) }), /429/);
});
