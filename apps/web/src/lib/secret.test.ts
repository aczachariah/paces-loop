import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertExamSessionSecretConfigured, ExamSecretConfigurationError, REJECTED_SECRETS, resolveExamSessionSecret } from './secret';

const strong = 'a'.repeat(16) + 'b'.repeat(16) + 'c'.repeat(8);

test('a strong secret is used in every environment', () => {
  for (const NODE_ENV of ['production', 'development', 'test', undefined]) {
    assert.equal(resolveExamSessionSecret({ NODE_ENV, EXAM_SESSION_SECRET: strong }), strong);
  }
});

test('missing, short or example secrets throw outside development and test', () => {
  for (const NODE_ENV of ['production', 'staging', undefined]) {
    for (const EXAM_SESSION_SECRET of [undefined, '', 'too-short', ...REJECTED_SECRETS]) {
      assert.throws(() => resolveExamSessionSecret({ NODE_ENV, EXAM_SESSION_SECRET }), ExamSecretConfigurationError, `${NODE_ENV}/${EXAM_SESSION_SECRET}`);
      assert.throws(() => assertExamSessionSecretConfigured({ NODE_ENV, EXAM_SESSION_SECRET }), ExamSecretConfigurationError);
    }
  }
});

test('the value shipped in .env.example is always rejected', () => {
  const example = readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8');
  const value = /^EXAM_SESSION_SECRET="([^"]*)"/m.exec(example)?.[1];
  assert.ok(value !== undefined, '.env.example documents EXAM_SESSION_SECRET');
  assert.ok(REJECTED_SECRETS.has(value!), '.env.example placeholder must be in the reject list');
  assert.throws(() => resolveExamSessionSecret({ NODE_ENV: 'production', EXAM_SESSION_SECRET: value }), ExamSecretConfigurationError);
});

test('development without a secret uses a random, stable per-process secret, never the example', () => {
  const first = resolveExamSessionSecret({ NODE_ENV: 'test' });
  const second = resolveExamSessionSecret({ NODE_ENV: 'test', EXAM_SESSION_SECRET: 'local-development-only-secret-change-me' });
  assert.equal(first, second);
  assert.ok(first.length >= 32);
  assert.equal(REJECTED_SECRETS.has(first), false);
});
