import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MAX_SILENT_RESTARTS, SPEECH_PRIVACY_NOTICE, VoiceCapture } from './VoiceCapture';

class FakeRecognition {
  static latest: FakeRecognition | null = null;
  static instances: FakeRecognition[] = [];
  onstart: (() => void) | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  aborted = false;
  listeners: Record<string, Array<(event?: any) => void>> = {};
  addEventListener(name: string, callback: (event?: any) => void) {
    (this.listeners[name] ||= []).push(callback);
  }
  emit(name: string, event?: any) { this.listeners[name]?.forEach(callback => callback(event)); }
  starts = 0;
  start() { this.starts++; this.aborted = false; }
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
  assert.equal(recognition.continuous, true);
  assert.equal(recognition.interimResults, true);
  await act(async () => { recognition.onresult?.({ results: [{ 0: { transcript: 'I examined' }, isFinal: false }] }); });
  assert.deepEqual(submitted, []);
  assert.equal(renderer.root.findByType('textarea').props.value, 'I examined');
  await act(async () => { recognition.onresult?.({ results: [{ 0: { transcript: 'I examined the cardiovascular system.' }, isFinal: true }] }); });
  assert.deepEqual(submitted, [], 'No automatic submission after final speech');
  assert.equal(renderer.root.findByProps({ 'aria-label': 'Submit presentation' }).props.disabled, true, 'Continuous capture must be stopped before submitting');
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
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
  await act(async () => { FakeRecognition.latest!.onend?.(); });
  assert.match(text(renderer.toJSON()), /Microphone access denied/);
  assert.doesNotMatch(text(renderer.toJSON()), /did not produce a transcript/);
  assert.equal(renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.disabled, false);
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

test('second microphone session works after a submitted finding', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const submitted: string[] = [];
  const renderer = await create({ label: 'Examination step', submitLabel: 'Examine', onSubmit: value => submitted.push(value) });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const first = FakeRecognition.latest!;
  await act(async () => { first.onresult?.({ results: [{ 0: { transcript: 'Inspect hands' }, isFinal: true }] }); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Examine' }).props.onClick(); });
  assert.deepEqual(submitted, ['Inspect hands']);
  await act(() => renderer.update(React.createElement(VoiceCapture, {
    label: 'Examination step', submitLabel: 'Examine', onSubmit: value => submitted.push(value), initialValue: '',
  })));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const second = FakeRecognition.latest!;
  assert.notEqual(second, first);
  await act(async () => { second.onresult?.({ results: [{ 0: { transcript: 'Palpate apex' }, isFinal: true }] }); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'Palpate apex');
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Examine' }).props.onClick(); });
  assert.deepEqual(submitted, ['Inspect hands', 'Palpate apex']);
});

test('late callbacks from the first session cannot stop or corrupt the next session', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const renderer = await create({ label: 'Examination step', submitLabel: 'Examine', onSubmit: () => {} });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const first = FakeRecognition.latest!;
  await act(async () => { first.onresult?.({ results: [{ 0: { transcript: 'Inspect hands' }, isFinal: true }] }); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Examine' }).props.onClick(); });
  await act(() => renderer.update(React.createElement(VoiceCapture, {
    label: 'Examination step', submitLabel: 'Examine', onSubmit: () => {}, initialValue: '',
  })));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const second = FakeRecognition.latest!;
  await act(async () => { first.onend?.(); });
  assert.equal(renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.disabled, false);
  assert.equal(renderer.root.findByType('textarea').props.disabled, true, 'Late first-session end must not unlock the active second-session composer');
  await act(async () => { second.onresult?.({ results: [{ 0: { transcript: 'Palpate apex' }, isFinal: true }] }); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'Palpate apex');
});

test('recognition ending without speech produces a recoverable no-result state', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const submitted: string[] = [];
  const renderer = await create({ label: 'Examination step', submitLabel: 'Examine', onSubmit: value => submitted.push(value) });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { FakeRecognition.latest!.onresult?.({ results: [{ 0: { transcript: 'Inspect hands' }, isFinal: true }] }); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Examine' }).props.onClick(); });
  await act(() => renderer.update(React.createElement(VoiceCapture, {
    label: 'Examination step', submitLabel: 'Examine', onSubmit: value => submitted.push(value), initialValue: '',
  })));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { FakeRecognition.latest!.onend?.(); });
  assert.match(text(renderer.toJSON()), /did not produce a transcript/i);
  assert.equal(renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.disabled, false);
  assert.deepEqual(submitted, ['Inspect hands']);
});

test('a recognition session that never starts offers a retry and typed fallback', async t => {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
  const renderer = await create({ label: 'Examination step', submitLabel: 'Examine' });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 8200)); });
  assert.match(text(renderer.toJSON()), /speech service did not start/i);
  assert.equal(renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.disabled, false);
  assert.equal(renderer.root.findByType('textarea').props.disabled, false);
});

test('diagnostics track both captures and copy only browser event metadata', async t => {
  const originalWindow = (globalThis as any).window;
  const originalNavigator = (globalThis as any).navigator;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  let copiedReport = '';
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async (report: string) => { copiedReport = report; } } },
  });
  t.after(() => {
    (globalThis as any).window = originalWindow;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator });
  });
  const renderer = await create({ label: 'Examination step', submitLabel: 'Examine' });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => {
    const first = FakeRecognition.latest!;
    first.emit('start');
    first.emit('speechstart');
    first.onresult?.({ results: [{ 0: { transcript: 'Sensitive speech content' }, isFinal: true }] });
  });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Examine' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => {
    const second = FakeRecognition.latest!;
    second.emit('start');
    second.emit('audiostart');
    second.emit('error', { error: 'no-speech' });
  });
  const details = text(renderer.root.findByProps({ className: 'speech-diagnostics' }).findByType('pre').props.children);
  const allContent = text(renderer.toJSON());
  assert.match(allContent, /Speech diagnostics/);
  assert.match(details, /Capture 1: final transcript received/);
  assert.match(details, /Capture 2: no-speech/);
  await act(async () => { await renderer.root.findByProps({ children: 'Copy report' }).props.onClick(); });
  assert.match(copiedReport, /Capture 1: final transcript received/);
  assert.match(copiedReport, /Capture 2: no-speech/);
  assert.doesNotMatch(copiedReport, /Sensitive speech content/);
});

/* ---------------- Long answers: continuous capture ---------------- */

function useFakeSpeech(t: any) {
  const original = (globalThis as any).window;
  (globalThis as any).window = { SpeechRecognition: FakeRecognition };
  t.after(() => { (globalThis as any).window = original; });
}

const final = (...segments: string[]) => ({ results: segments.map(transcript => ({ 0: { transcript }, isFinal: true })) });

test('tapping Speak again appends to existing text instead of clearing it', async t => {
  useFakeSpeech(t);
  const renderer = await create();
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByType('textarea').props.onChange({ target: { value: '68-year-old woman in AF.' } }); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  assert.equal(renderer.root.findByType('textarea').props.value, '68-year-old woman in AF.', 'starting capture keeps typed text');
  await act(async () => { FakeRecognition.latest!.onresult?.(final('The apex beat is displaced.')); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { FakeRecognition.latest!.onresult?.({ results: [{ 0: { transcript: 'There is a pansystolic' }, isFinal: false }] }); });
  assert.equal(renderer.root.findByType('textarea').props.value, '68-year-old woman in AF. The apex beat is displaced. There is a pansystolic');
  await act(async () => { FakeRecognition.latest!.onresult?.(final('There is a pansystolic murmur.')); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  assert.equal(renderer.root.findByType('textarea').props.value, '68-year-old woman in AF. The apex beat is displaced. There is a pansystolic murmur.');
});

test('multiple final segments within one capture accumulate in order', async t => {
  useFakeSpeech(t);
  const submitted: string[] = [];
  const renderer = await create({ onSubmit: value => submitted.push(value) });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  await act(async () => { recognition.onresult?.(final('Irregularly irregular pulse.')); });
  await act(async () => { recognition.onresult?.({ results: [{ 0: { transcript: 'Irregularly irregular pulse.' }, isFinal: true }, { 0: { transcript: 'Raised JVP' }, isFinal: false }] }); });
  await act(async () => { recognition.onresult?.(final('Irregularly irregular pulse.', 'Raised JVP with v waves.')); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Submit presentation' }).props.onClick(); });
  assert.deepEqual(submitted, ['Irregularly irregular pulse. Raised JVP with v waves.']);
});

test('browser auto-end mid-answer restarts transparently and keeps earlier text', async t => {
  useFakeSpeech(t);
  const renderer = await create();
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  assert.equal(recognition.starts, 1);
  await act(async () => { recognition.onresult?.(final('First part of my presentation.')); });
  await act(async () => { recognition.onend?.(); });
  assert.equal(recognition.starts, 2, 'restarted after an unrequested end');
  assert.ok(renderer.root.findByProps({ 'aria-label': 'Stop microphone' }), 'still listening');
  await act(async () => { recognition.onresult?.(final('Second part.')); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'First part of my presentation. Second part.');
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  assert.equal(recognition.starts, 2, 'explicit Stop never restarts');
  assert.equal(renderer.root.findByType('textarea').props.value, 'First part of my presentation. Second part.');
});

test('repeated silent restarts are capped, then listening pauses with text kept', async t => {
  useFakeSpeech(t);
  const renderer = await create();
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  await act(async () => { recognition.onresult?.(final('My answer so far.')); });
  await act(async () => { recognition.onend?.(); });
  for (let silent = 0; silent < MAX_SILENT_RESTARTS; silent++) {
    await act(async () => { recognition.onerror?.({ error: 'no-speech' }); recognition.onend?.(); });
  }
  assert.equal(recognition.starts, 1 + 1 + MAX_SILENT_RESTARTS);
  await act(async () => { recognition.onend?.(); });
  assert.equal(recognition.starts, 1 + 1 + MAX_SILENT_RESTARTS, 'no restart beyond the silent cap');
  assert.ok(renderer.root.findByProps({ 'aria-label': 'Start microphone' }));
  assert.equal(renderer.root.findByType('textarea').props.value, 'My answer so far.');
  assert.match(text(renderer.toJSON()), /Listening paused after a silence/);
});

test('a fatal error after speech stops without restarting and keeps the transcript', async t => {
  useFakeSpeech(t);
  const renderer = await create();
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  const recognition = FakeRecognition.latest!;
  await act(async () => { recognition.onresult?.(final('Mitral regurgitation.')); });
  await act(async () => { recognition.onerror?.({ error: 'network' }); recognition.onend?.(); });
  assert.equal(recognition.starts, 1);
  assert.match(text(renderer.toJSON()), /speech service could not be reached/);
  assert.equal(renderer.root.findByType('textarea').props.value, 'Mitral regurgitation.');
  assert.equal(renderer.root.findByType('textarea').props.disabled, false);
});

test('after a successful submission the next capture starts fresh; after a failure it appends', async t => {
  useFakeSpeech(t);
  const submitted: string[] = [];
  const props = { label: 'Answer', submitLabel: 'Submit answer', onSubmit: (value: string) => submitted.push(value) };
  const renderer = await create(props);
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { FakeRecognition.latest!.onresult?.(final('Answer one.')); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Submit answer' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'Answer one.', 'text is not wiped before new speech arrives');
  await act(async () => { FakeRecognition.latest!.onresult?.(final('Answer two.')); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'Answer two.');
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Stop microphone' }).props.onClick(); });
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Submit answer' }).props.onClick(); });
  await act(() => renderer.update(React.createElement(VoiceCapture, { ...props, error: 'Network error. Please retry.' })));
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Start microphone' }).props.onClick(); });
  await act(async () => { FakeRecognition.latest!.onresult?.(final('And one more point.')); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'Answer two. And one more point.');
  assert.deepEqual(submitted, ['Answer one.', 'Answer two.']);
});

test('shows a notice that browser speech recognition may send audio to Google or Apple', async () => {
  const renderer = await create();
  assert.match(text(renderer.toJSON()), /Google or Apple/);
  assert.match(SPEECH_PRIVACY_NOTICE, /Type instead/);
  await act(async () => { renderer.unmount(); });
});
