// Run with: node --test tests/compositionSessionStore.test.cjs
const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { compositionSession: session, useCompositionState } = require('../src/stores/compositionSessionStore.ts');
const initial = session.getInitialState();
beforeEach(() => session.setState(initial, true));

test('unmounting subscribers retains each lesson, A/B backup and image settings without browser storage', t => {
  // Any attempt to persist an uploaded image must fail this test. Navigation
  // retention must work even when browser storage is unavailable.
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: Object.defineProperties({}, {
      localStorage: { get() { throw new Error('Image session must stay in memory'); } },
      sessionStorage: { get() { throw new Error('Image session must stay in memory'); } },
    }),
  });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else delete globalThis.window;
  });

  const direction = initial.studies.direction.objects.map(object => object.id === 'pencil' ? { ...object, angle: 73 } : object);
  const ownScale = initial.studies.scale.objects.map(object => object.id === 'box' ? { ...object, scale: 1.1 } : object);
  const stop = session.subscribe(() => {});
  session.setState({
    lesson: 'direction', selectedId: 'pencil', silhouette: true,
    studies: {
      ...initial.studies,
      scale: { ...initial.studies.scale, savedObjects: ownScale },
      direction: { objects: direction, preset: null },
    },
    imageUrl: 'data:image/png;base64,private-image', sampleFor: null,
    ratio: '1', panX: 37, threshold: 184, inverted: true,
    guides: ['diagonals', 'spiral'], rotation: 90, scale: 132, offsetX: 12,
  });
  const beforeNavigation = session.getState();
  stop();
  // A new route subscribes to the same store rather than constructing a draft.
  const stopReturningPage = session.subscribe(() => {});
  assert.strictEqual(session.getState(), beforeNavigation);
  assert.equal(session.getState().studies.direction.objects.find(object => object.id === 'pencil').angle, 73);
  assert.equal(session.getState().studies.scale.savedObjects[0].scale, 1.1);
  assert.equal(session.getState().panX, 37);
  assert.deepEqual(session.getState().guides, ['diagonals', 'spiral']);
  stopReturningPage();
});

test('server rendering uses safe defaults and never leaks a client image or overwrites the client draft', () => {
  session.setState({ imageUrl: 'data:image/png;base64,private-image', threshold: 184, lesson: 'direction' });
  const clientDraft = session.getState();
  function Snapshot() {
    const [imageUrl] = useCompositionState('imageUrl');
    const [threshold] = useCompositionState('threshold');
    const [lesson] = useCompositionState('lesson');
    return React.createElement('output', null, `${imageUrl ?? 'sample'}:${threshold}:${lesson}`);
  }
  assert.equal(renderToString(React.createElement(Snapshot)), '<output>sample:128:scale</output>');
  assert.strictEqual(session.getState(), clientDraft);
  assert.equal(session.getInitialState().imageUrl, null);
});
