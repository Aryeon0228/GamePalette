// Run with: node --test tests/resizePalette.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolveFilename.call(this, request.startsWith('@/')
    ? path.join(projectRoot, 'src', request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { resizePaletteColors } = require('../src/lib/resizePalette.ts');
const { colorFromHex } = require('../src/lib/colorAnalysis.ts');
const key = (color) => color.hex.toUpperCase();

function freezePalette(colors) {
  for (const color of colors) {
    Object.freeze(color.rgb);
    Object.freeze(color.hsl);
    Object.freeze(color);
  }
  return Object.freeze(colors);
}

function assertUniqueFills(source, result) {
  const seen = new Set(source.map(key));
  for (const color of result.slice(source.length)) {
    assert.match(color.hex, /^#[0-9A-F]{6}$/);
    assert.equal(seen.has(key(color)), false, `duplicate appended color ${color.hex}`);
    seen.add(key(color));
  }
}

test('shrinking and growing preserve source order, exact objects, and metadata without mutation', () => {
  const source = freezePalette([
    { ...colorFromHex('#643D86'), hex: '#643d86', name: 'Picked violet' },
    colorFromHex('#A8B5A2'), colorFromHex('#D9A350'),
  ]);
  const before = structuredClone(source);
  const smaller = resizePaletteColors(source, 2, '#FFFFFF');
  assert.notStrictEqual(smaller, source);
  assert.equal(smaller.length, 2);
  assert.strictEqual(smaller[0], source[0]);
  assert.strictEqual(smaller[1], source[1]);
  const larger = resizePaletteColors(source, 12, '#643D86');
  assert.equal(larger.length, 12);
  for (let index = 0; index < source.length; index++) assert.strictEqual(larger[index], source[index]);
  assert.deepEqual(source, before);
  assertUniqueFills(source, larger);
});

test('repeated resizing is deterministic and N+1 extends the same candidate prefix', () => {
  const source = [colorFromHex('#A8B5A2'), colorFromHex('#D9A350')];
  const all = resizePaletteColors(source, 32, '#643D86');
  assert.deepEqual(resizePaletteColors(source, 32, '#643D86'), all);
  for (let count = 1; count <= 32; count++) {
    assert.deepEqual(resizePaletteColors(source, count, '#643D86'), all.slice(0, count));
  }
});

test('empty palettes begin with the exact fallback and fill to the requested length', () => {
  const result = resizePaletteColors([], 32, 'abc');
  assert.equal(result.length, 32);
  assert.equal(result[0].hex, '#AABBCC');
  assertUniqueFills([], result);
  assert.notDeepEqual(result, resizePaletteColors([], 32, '#123456'));
});

test('black, white and gray can grow to 32 distinct, achromatic colors', () => {
  for (const hex of ['#000000', '#FFFFFF', '#808080', '#010101', '#FEFEFE']) {
    const source = [colorFromHex(hex)];
    const result = resizePaletteColors(source, 32, hex);
    assert.equal(result.length, 32);
    assert.equal(result[0].hex, hex);
    assertUniqueFills(source, result);
    for (const color of result) {
      assert.equal(color.rgb.r, color.rgb.g);
      assert.equal(color.rgb.g, color.rgb.b);
    }
  }
});

test('existing duplicates remain untouched while appended fills avoid all existing colors', () => {
  const first = colorFromHex('#643D86');
  const duplicate = { ...first, hex: first.hex.toLowerCase(), name: 'Intentional duplicate' };
  const source = [first, duplicate, colorFromHex('#000000')];
  const result = resizePaletteColors(source, 32, '#643D86');
  assert.equal(result.length, 32);
  assert.strictEqual(result[1], duplicate);
  assertUniqueFills(source, result);
});

test('many existing colors still fill exactly to the limit and oversized sources return a prefix', () => {
  const source = Array.from({ length: 27 }, (_, index) => colorFromHex(`#${(index * 0x080808).toString(16).padStart(6, '0')}`));
  const result = resizePaletteColors(source, 32, '#808080');
  assert.equal(result.length, 32);
  assert.deepEqual(result.slice(0, source.length), source);
  assertUniqueFills(source, result);
  const oversized = [...source, ...source];
  assert.deepEqual(resizePaletteColors(oversized, 50, '#000000'), oversized.slice(0, 32));
});

test('count normalization handles NaN, infinities, fractions, and lower/upper bounds', () => {
  const source = ['#112233', '#445566', '#778899'].map(colorFromHex);
  for (const [count, expected] of [[0, 1], [-9, 1], [-Infinity, 1], [2.9, 2], [32.8, 32], [100, 32], [Infinity, 32], [NaN, 3]]) {
    assert.equal(resizePaletteColors(source, count, '#112233').length, expected);
  }
  assert.equal(resizePaletteColors([], NaN, '#112233').length, 1);
  assert.equal(resizePaletteColors([], 1, 'invalid').length, 1);
});
