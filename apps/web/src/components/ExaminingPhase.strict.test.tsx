import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
for (const [key, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};

test('Strict Mode development effect replay accepts examination responses', async t => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { act } = React;
  const { default: ExaminingPhase } = await import('./ExaminingPhase');
  const originalFetch = globalThis.fetch;
  let resolveRequest!: (response: any) => void;
  globalThis.fetch = ((_input: any, _init: any) => new Promise(resolve => { resolveRequest = resolve; })) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const tokens: string[] = [];
  const findings: string[] = [];
  const root = createRoot(document.getElementById('root')!);
  await act(async () => {
    root.render(React.createElement(React.StrictMode, null, React.createElement(ExaminingPhase, {
      caseData: { id: 'cardio-01', brief: 'Brief' }, timeRemaining: 540, findings: [], sessionToken: null,
      onFinding: finding => findings.push(finding.findingId), onSessionToken: token => tokens.push(token), onComplete: () => {},
    })));
  });
  t.after(() => act(() => root.unmount()));
  const textarea = document.querySelector('textarea')!;
  const valueSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    valueSetter.call(textarea, 'Inspect hands');
    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const examine = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Examine')!;
  assert.ok(examine);
  await act(async () => { examine.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
  assert.ok(resolveRequest);
  await act(async () => {
    resolveRequest({ ok: true, status: 200, json: async () => ({ finding: { findingId: 'hands' }, sessionToken: 'fresh-token' }) });
    await Promise.resolve();
  });
  assert.deepEqual(tokens, ['fresh-token']);
  assert.deepEqual(findings, ['hands']);
  assert.equal(textarea.disabled, false);
});
