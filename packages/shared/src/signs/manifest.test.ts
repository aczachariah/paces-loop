import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FINDINGS_BY_KEY, questionsForClip } from './findings';
import { SIGN_CLIPS, SIGN_MANIFEST, clipsForDeck } from './library';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', '..', '..', '..', 'apps', 'web', 'public');

test('manifest has a reasonable number of uniquely identified clips', () => {
  assert.ok(SIGN_CLIPS.length >= 20 && SIGN_CLIPS.length <= 40, `got ${SIGN_CLIPS.length}`);
  assert.equal(new Set(SIGN_CLIPS.map(c => c.id)).size, SIGN_CLIPS.length);
  assert.equal(new Set(SIGN_CLIPS.map(c => `${c.source}:${c.recordId}`)).size, SIGN_CLIPS.length);
});

test('every clip comes from an attribution-licensed open dataset, never ICBHI', () => {
  for (const c of SIGN_CLIPS) {
    assert.ok(c.source === 'physionet-2016' || c.source === 'circor-2022', c.id);
    assert.equal(c.licence, 'ODC-By-1.0');
    assert.ok(c.attribution.length > 40, `${c.id} attribution`);
    assert.match(c.sourceUrl, /^https:\/\/physionet\.org\/content\//);
    assert.doesNotMatch(JSON.stringify(c), /icbhi/i);
    assert.equal(c.status, 'Real recording, open dataset; labels from dataset, pending clinician review');
    assert.ok(SIGN_MANIFEST.sources[c.source], `${c.id} source entry`);
  }
});

test('every clip has an audio file on disk of sensible length and size', () => {
  let bytes = 0;
  for (const c of SIGN_CLIPS) {
    assert.match(c.audio, /^\/signs\/audio\/hs-\d+\.mp3$/);
    const file = join(publicDir, c.audio);
    assert.ok(existsSync(file), `${file} missing`);
    bytes += statSync(file).size;
    assert.ok(c.durationSec >= 8 && c.durationSec <= 15, `${c.id} duration ${c.durationSec}`);
    assert.equal(readFileSync(file).subarray(0, 3).toString('latin1'), 'ID3', `${c.id} is not an MP3 with ID3 header`);
  }
  assert.ok(bytes < 30 * 1024 * 1024, `library is ${bytes} bytes`);
});

test('labels only use known findings and values, and match what each dataset can support', () => {
  for (const c of SIGN_CLIPS) {
    const keys = Object.keys(c.labels);
    assert.ok(keys.length > 0, c.id);
    for (const k of keys) {
      const def = FINDINGS_BY_KEY[k as keyof typeof FINDINGS_BY_KEY];
      assert.ok(def, `${c.id} unknown finding ${k}`);
      const value = (c.labels as Record<string, unknown>)[k];
      assert.ok(def.options.some(o => o.value === value), `${c.id} ${k}=${String(value)} not an option`);
    }
    if (c.source === 'physionet-2016') {
      assert.deepEqual(keys.sort(), ['diagnosis', 'heartSounds']);
      assert.equal(c.labels.heartSounds === 'normal', c.labels.diagnosis === 'normal', `${c.id} class/diagnosis disagree`);
      assert.equal(c.context.population, 'adult');
    } else {
      assert.equal(c.labels.heartSounds, undefined, 'CirCor has no normal/abnormal sound label');
      assert.equal(c.labels.diagnosis, undefined);
      assert.ok(c.context.site, `${c.id} CirCor clips record their auscultation site`);
      assert.equal(c.context.population, 'paediatric');
      if (c.labels.murmur === 'absent') assert.deepEqual(keys, ['murmur'], `${c.id} absent murmur must not be characterised`);
      if (c.labels.systolicMurmur === 'absent') assert.equal(c.labels.systolicTiming, undefined);
    }
    assert.equal(questionsForClip(c.labels).length, keys.length);
  }
});

test('decks partition the library and each covers both classes', () => {
  const adult = clipsForDeck('adult'), murmur = clipsForDeck('murmur');
  assert.equal(adult.length + murmur.length, SIGN_CLIPS.length);
  assert.ok(adult.some(c => c.labels.heartSounds === 'normal') && adult.some(c => c.labels.heartSounds === 'abnormal'));
  assert.ok(murmur.some(c => c.labels.murmur === 'present') && murmur.some(c => c.labels.murmur === 'absent'));
});
