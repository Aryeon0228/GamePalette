// Run with: node --test tests/imageValueStudy.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const {
  grayscaleValue, analyzeImageValues, normalizeValueThresholds, measureValueAreas,
  renderValuePreview, valueStudySize, VALUE_TONE_LEVELS,
} = require('../src/lib/imageValueStudy.ts');

const rgba = (...pixels) => new Uint8ClampedArray(pixels.flat());

test('grayscale uses linear sRGB luminance and re-encodes for display', () => {
  assert.equal(grayscaleValue(255, 0, 0), 127);
  assert.equal(grayscaleValue(0, 255, 0), 220);
  assert.equal(grayscaleValue(0, 0, 255), 76);
  assert.equal(grayscaleValue(255, 255, 0), 247);
  for (let gray = 0; gray <= 255; gray++) assert.equal(grayscaleValue(gray, gray, gray), gray);
});

test('areas count alpha >= 128 only, with threshold values in the next band', () => {
  const pixels = rgba([0, 0, 0, 0], [0, 0, 0, 127], [84, 84, 84, 128], [85, 85, 85, 255], [169, 169, 169, 255], [170, 170, 170, 255], [255, 255, 255, 255]);
  const analysis = analyzeImageValues(pixels);
  assert.equal(analysis.opaquePixelCount, 5);
  const result = measureValueAreas(analysis, 85, 170);
  assert.deepEqual(result.counts, [1, 2, 2]);
  assert.deepEqual(result.percentages, [20, 40, 40]);
  assert.equal(result.percentages.reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual(measureValueAreas(analysis, 170, 220).counts, [3, 1, 1]);
});

test('fully transparent and empty images have no measurable area', () => {
  for (const pixels of [rgba(), rgba([255, 255, 255, 0], [0, 0, 0, 127])]) {
    const analysis = analyzeImageValues(pixels);
    assert.equal(analysis.opaquePixelCount, 0);
    assert.deepEqual(measureValueAreas(analysis, 85, 170).percentages, [0, 0, 0]);
  }
});

test('threshold normalization preserves ordering and finite, useful bounds', () => {
  assert.deepEqual(normalizeValueThresholds(85, 170), [85, 170]);
  assert.deepEqual(normalizeValueThresholds(200, 20), [20, 200]);
  assert.deepEqual(normalizeValueThresholds(170, 170), [170, 171]);
  assert.deepEqual(normalizeValueThresholds(-10, -5), [1, 2]);
  assert.deepEqual(normalizeValueThresholds(999, 999), [254, 255]);
  assert.deepEqual(normalizeValueThresholds(NaN, Infinity), [85, 170]);
});

test('preview modes preserve alpha, respect boundaries and never mutate pixels', () => {
  const pixels = rgba([255, 0, 0, 255], [0, 255, 0, 128], [0, 0, 255, 255], [255, 255, 255, 0]);
  const before = new Uint8ClampedArray(pixels);
  const analysis = analyzeImageValues(pixels);
  const original = renderValuePreview(pixels, analysis, 'original', 85, 170);
  assert.deepEqual(original, pixels);
  assert.notEqual(original, pixels);
  assert.deepEqual([...renderValuePreview(pixels, analysis, 'grayscale', 85, 170)], [127, 127, 127, 255, 220, 220, 220, 128, 76, 76, 76, 255, 255, 255, 255, 0]);
  const tones = renderValuePreview(pixels, analysis, 'tones', 85, 170);
  assert.deepEqual([tones[0], tones[4], tones[8]], [VALUE_TONE_LEVELS[1], VALUE_TONE_LEVELS[2], VALUE_TONE_LEVELS[0]]);
  assert.deepEqual(pixels, before);
});

test('area highlighting reveals matching source color and dims only other counted pixels', () => {
  const pixels = rgba([255, 0, 0, 255], [0, 255, 0, 128], [0, 0, 255, 255], [255, 0, 0, 127]);
  const analysis = analyzeImageValues(pixels);
  const preview = renderValuePreview(pixels, analysis, 'tones', 85, 170, 1);
  assert.deepEqual([...preview.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...preview.slice(4, 8)], [220, 220, 220, 23]);
  assert.deepEqual([...preview.slice(8, 12)], [76, 76, 76, 46]);
  assert.equal(preview[15], 0);
  assert.deepEqual([...pixels.slice(12)], [255, 0, 0, 127]);
});

test('sampling bounds long edges to 384 pixels without upscaling or zero dimensions', () => {
  assert.deepEqual(valueStudySize(4000, 3000), { width: 384, height: 288 });
  assert.deepEqual(valueStudySize(3000, 4000), { width: 288, height: 384 });
  assert.deepEqual(valueStudySize(96, 32), { width: 96, height: 32 });
  assert.deepEqual(valueStudySize(1, 100000), { width: 1, height: 384 });
  assert.throws(() => valueStudySize(0, 10));
  assert.throws(() => valueStudySize(Infinity, 10));
});
