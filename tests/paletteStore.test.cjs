// Run with: node --test tests/paletteStore.test.cjs
// Reuse the project's TypeScript compiler without adding a test dependency.
const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolveFilename.call(this, request.startsWith('@/')
    ? path.join(projectRoot, 'src', request.slice(2))
    : request, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const values = new Map();
global.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
};
Object.defineProperty(global, 'localStorage', { value: global.window.localStorage, configurable: true });

const { usePaletteStore: store } = require('../src/stores/paletteStore.ts');
const { applyStyleFilter } = require('../src/lib/styleFilters.ts');
const { hexToRgb, rgbToHsl } = require('../src/lib/utils.ts');
const initialState = store.getState();
const storageKey = 'pixelpow-storage';

function color(hex) {
  const rgb = hexToRgb(hex);
  return { hex, rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b) };
}

function startDraft(colors = [color('#643D86'), color('#D9A350')]) {
  store.getState().setCurrentPalette({
    id: 'draft', name: 'Working palette', colors, style: 'original', tags: [],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  });
  store.getState().setOriginalColors(colors);
  return colors;
}

beforeEach(() => {
  values.clear();
  store.setState(initialState, true);
});

test('saving stores one application of the style and excludes vision previews', () => {
  const original = startDraft();
  store.getState().setCurrentStyle('stylized');
  const styled = applyStyleFilter(original, 'stylized');
  store.getState().toggleValueCheck();
  store.getState().setColorBlindMode('protanopia');
  assert.notDeepEqual(store.getState().getDisplayColors(), styled);

  const id = store.getState().savePalette('Styled palette');
  const saved = store.getState().getPaletteById(id);
  assert.deepEqual(saved.colors, styled);
  assert.notDeepEqual(saved.colors, applyStyleFilter(styled, 'stylized'));
  assert.equal(saved.style, 'stylized');
  assert.deepEqual(store.getState().originalColors, original);
});

test('manual edits, insertion, reordering and deletion keep the supplied colors exact', () => {
  startDraft();
  store.getState().setCurrentStyle('hypercasual');
  const styled = store.getState().currentPalette.colors;
  const edited = [color('#123456'), styled[1]];
  store.getState().updateColors(edited);
  assert.deepEqual(store.getState().currentPalette.colors, edited);
  assert.deepEqual(store.getState().originalColors, edited);
  assert.equal(store.getState().currentStyle, 'original');
  assert.equal(store.getState().currentPalette.style, 'original');

  const added = [...edited, color('#FEDCBA')];
  store.getState().updateColors(added);
  store.getState().updateColors([added[2], added[0], added[1]]);
  assert.deepEqual(store.getState().currentPalette.colors.map((item) => item.hex), ['#FEDCBA', '#123456', styled[1].hex]);
  store.getState().updateColors([added[2], added[0]]);
  assert.deepEqual(store.getState().currentPalette.colors.map((item) => item.hex), ['#FEDCBA', '#123456']);
});

test('re-extraction retains the active style and applies it once to the new source', () => {
  startDraft();
  store.getState().setCurrentStyle('realistic');
  const extracted = [color('#80BC31')];
  store.getState().setOriginalColors(extracted);
  assert.deepEqual(store.getState().originalColors, extracted);
  assert.deepEqual(store.getState().currentPalette.colors, applyStyleFilter(extracted, 'realistic'));
  assert.equal(store.getState().currentPalette.style, 'realistic');
});

test('draft name, exact colors, original source and custom settings survive refresh', async () => {
  const original = startDraft();
  const settings = { saturationMultiplier: 1.2, lightnessMultiplier: 0.8, hueShift: 24 };
  store.getState().setCustomSettings(settings);
  store.getState().setCurrentStyle('custom');
  const styled = store.getState().currentPalette.colors;
  const persisted = values.get(storageKey);

  store.setState(initialState, true);
  values.set(storageKey, persisted);
  await store.persist.rehydrate();
  assert.equal(store.getState().currentPalette.name, 'Working palette');
  assert.deepEqual(store.getState().currentPalette.colors, styled);
  assert.deepEqual(store.getState().originalColors, original);
  assert.equal(store.getState().currentStyle, 'custom');
  assert.deepEqual(store.getState().customSettings, settings);
  store.getState().setCurrentStyle('original');
  assert.deepEqual(store.getState().currentPalette.colors, original);
});

test('draft persistence omits upload data while explicitly saved library images remain intact', () => {
  startDraft();
  const sourceImageUrl = `data:image/png;base64,${'A'.repeat(10000)}`;
  store.getState().setCurrentPalette({ ...store.getState().currentPalette, sourceImageUrl });
  store.getState().setSourceImageUrl(sourceImageUrl);
  let persisted = JSON.parse(values.get(storageKey)).state;
  assert.equal(persisted.currentPalette.sourceImageUrl, undefined);
  assert.equal(persisted.sourceImageUrl, null);
  assert.equal(store.getState().sourceImageUrl, sourceImageUrl);

  store.getState().savePalette('Image palette');
  persisted = JSON.parse(values.get(storageKey)).state;
  assert.equal(persisted.savedPalettes[0].sourceImageUrl, sourceImageUrl);
  assert.equal(persisted.currentPalette.sourceImageUrl, undefined);
});

test('editing a saved draft does not mutate its library snapshot', () => {
  const original = startDraft();
  const id = store.getState().savePalette('Snapshot');
  store.getState().updateColors([color('#ABCDEF')]);
  assert.deepEqual(store.getState().getPaletteById(id).colors, original);
  assert.equal(store.getState().getPaletteById(id).name, 'Snapshot');
});

test('moving a library palette also updates its open draft and deleting the folder clears both', () => {
  startDraft();
  const id = store.getState().savePalette('Folder palette');
  store.getState().createFolder('Collection');
  const folder = store.getState().folders[0];
  store.getState().movePaletteToFolder(id, folder.id);
  assert.equal(store.getState().getPaletteById(id).folderId, folder.id);
  assert.equal(store.getState().currentPalette.folderId, folder.id);
  store.getState().deleteFolder(folder.id);
  assert.equal(store.getState().folders.length, 0);
  assert.equal(store.getState().getPaletteById(id).folderId, undefined);
  assert.equal(store.getState().currentPalette.folderId, undefined);
});

test('legacy library and folders migrate without transforming their stored colors', async () => {
  startDraft();
  store.getState().setCurrentStyle('stylized');
  store.getState().savePalette('Legacy styled');
  const saved = JSON.parse(JSON.stringify(store.getState().savedPalettes));
  const folders = [{ id: 'folder', name: 'Original folder', createdAt: '2026-01-01' }];
  store.setState(initialState, true);
  values.delete(storageKey);
  values.set('gamepalette-storage', JSON.stringify({ state: { savedPalettes: saved, folders }, version: 0 }));
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().savedPalettes, saved);
  assert.deepEqual(store.getState().folders, folders);
  store.getState().setColorCount(6);
  assert.equal(values.has('gamepalette-storage'), false);
  assert.deepEqual(JSON.parse(values.get(storageKey)).state.savedPalettes, saved);
});


test('old untouched starter migrates to empty while the saved library is preserved', async () => {
  const starter = ['#A8B5A2', '#DAD1BA', '#B5785D', '#536A7B', '#303843'].map(color);
  startDraft(starter);
  store.getState().setCurrentPalette({ ...store.getState().currentPalette, name: 'Untitled Palette' });
  const old = JSON.parse(values.get(storageKey)).state;
  old.savedPalettes = [{ ...old.currentPalette, id: 'saved-copy', name: 'Keep this' }];
  values.set(storageKey, JSON.stringify({ state: old, version: 0 }));
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().currentPalette.colors, []);
  assert.deepEqual(store.getState().originalColors, []);
  assert.deepEqual(store.getState().savedPalettes, old.savedPalettes);
  assert.equal(JSON.parse(values.get(storageKey)).version, 1);
  store.getState().setOriginalColors([color('#123456'), color('#ABCDEF')]);
  assert.deepEqual(store.getState().currentPalette.colors.map(c => c.hex), ['#123456', '#ABCDEF']);
});

test('starter migration preserves renamed, edited, imported, older and saved drafts', () => {
  startDraft(['#A8B5A2', '#DAD1BA', '#B5785D', '#536A7B', '#303843'].map(color));
  store.getState().setCurrentPalette({ ...store.getState().currentPalette, name: 'Untitled Palette' });
  const base = JSON.parse(values.get(storageKey)).state;
  const migrate = store.persist.getOptions().migrate;
  for (const change of [
    s => { s.currentPalette.name = 'My palette'; },
    s => { s.currentPalette.colors[0] = color('#123456'); },
    s => { s.originalColors[0] = color('#123456'); },
    s => { s.currentPalette.updatedAt = '2026-01-02T00:00:00.000Z'; },
    s => { s.sourceImageUrl = 'https://example.com/photo.png'; },
    s => { s.currentStyle = 'stylized'; },
    s => { s.savedPalettes = [structuredClone(s.currentPalette)]; },
  ]) {
    const state = structuredClone(base);
    change(state);
    assert.strictEqual(migrate(state, 0), state);
  }
});
