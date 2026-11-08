import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { VoiceCapture } from './VoiceCapture';

class FakeRecognition {
  static latest: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  aborted = false;
  start() { this.aborted = false; }
  stop() { this.onend?.(); }
  abort() { this.aborted = true; }
  constructor() { FakeRecognition.latest = this; }
}

function text(node: any): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return node.children ? text(node.children) : '';
}

async function create(props: Partial<React.ComponentProps<typeof VoiceCapture>> = {}) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(VoiceCapture, {
      label: 'Presentation', submitLabel: 'Submit presentation', onSubmit: () => {}, ...props,
    }));
  });
  return renderer;
}

test('interim speech remains a draft and final speech requires explicit confirmation', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const submitted: string[] = [];
  const renderer = await create({ onSubmit: value => submitted.push(value) });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  assert.equal(recognition.continuous, false);
  await act(async () => { recognition.onresult?.({ results: [{ 0: { transcript: 'I examined' }, isFinal: false }] }); });
  assert.deepEqual(submitted, []);
  assert.equal(renderer.root.findByType('textarea').props.value, 'I examined');
  await act(async () => { recognition.onresult?.({ results: [{ 0: { transcript: 'I examined the cardiovascular system.' }, isFinal: true }] }); });
  assert.deepEqual(submitted, [], 'No automatic submission after final speech');
  assert.match(text(renderer.toJSON()), /Review and edit your transcript/);
  await act(async () => { renderer.root.findByType('textarea').props.onChange({ target: { value: 'Edited presentation' } }); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Submit presentation' }).props.onClick(); });
  assert.deepEqual(submitted, ['Edited presentation']);
});

test('loading and failure retain the submitted draft for explicit retry', async () => {
  const renderer = await create({ loading: true, error: 'Try again.', initialValue: 'Retain my answer' });
  const textarea = renderer.root.findByType('textarea');
  assert.equal(textarea.props.value, 'Retain my answer');
  assert.equal(renderer.root.findByProps({ 'aria-label': 'Submit presentation' }).props.disabled, true);
  assert.match(text(renderer.toJSON()), /Try again/);
  await act(() => renderer.update(React.createElement(VoiceCapture, {
    label: 'Presentation', submitLabel: 'Submit presentation', onSubmit: () => {}, initialValue: 'Retain my answer', loading: false, error: null,
  })));
  assert.equal(renderer.root.findByType('textarea').props.value, 'Retain my answer');
  await act(async () => { renderer.unmount(); });
});

test('microphone denial explains typed fallback and does not submit', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { webkitSpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const submitted: string[] = [];
  const renderer = await create({ onSubmit: value => submitted.push(value) });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { FakeRecognition.latest!.onerror?.({ error: 'not-allowed' }); });
  assert.match(text(renderer.toJSON()), /Microphone access denied/);
  assert.match(text(renderer.toJSON()), /type/i);
  assert.deepEqual(submitted, []);
});

test('explicit stop keeps an interim transcript editable and submittable', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const submitted: string[] = [];
  const renderer = await create({ onSubmit: value => submitted.push(value) });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  await act(async () => { recognition.onresult?.({ results: [{ 0: { transcript: 'Auscultate the apex' }, isFinal: false }] }); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  assert.equal(renderer.root.findByType('textarea').props.disabled, false);
  assert.equal(renderer.root.findByType('textarea').props.value, 'Auscultate the apex');
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Submit presentation' }).props.onClick(); });
  assert.deepEqual(submitted, ['Auscultate the apex']);
});

test('unmount aborts recognition and ignores late speech callbacks', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const submitted: string[] = [];
  const renderer = await create({ onSubmit: value => submitted.push(value) });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  await act(async () => { renderer.unmount(); });
  assert.equal(recognition.aborted, true);
  recognition.onresult?.({ results: [{ 0: { transcript: 'Late speech' }, isFinal: true }] });
  assert.deepEqual(submitted, []);
});
