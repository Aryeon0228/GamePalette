// Run with: node --test tests/imageCompositionStudy.test.cjs
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
  compositionCrop, renderCompositionMask, compositionGuideGeometry,
  goldenSpiralPoints, GOLDEN_RATIO, GOLDEN_SPIRAL_CENTER,
} = require('../src/lib/imageCompositionStudy.ts');
const { grayscaleValue } = require('../src/lib/imageValueStudy.ts');

const rgba = (...pixels) => new Uint8ClampedArray(pixels.flat());
const near = (actual, expected, tolerance = 1e-10) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `Expected ${actual} to be within ${tolerance} of ${expected}`,
);
const levels = pixels => Array.from(pixels).filter((_, index) => index % 4 === 0);

test('cover crop preserves frame aspect and maps pan to the available source edges', () => {
  assert.deepEqual(compositionCrop(1600, 900, 1, 0, 0), { sx: 350, sy: 0, sw: 900, sh: 900 });
  assert.deepEqual(compositionCrop(1600, 900, 1, -100, 100), { sx: 0, sy: 0, sw: 900, sh: 900 });
  assert.deepEqual(compositionCrop(1600, 900, 1, 100, -100), { sx: 700, sy: 0, sw: 900, sh: 900 });
  assert.deepEqual(compositionCrop(900, 1600, 1, -100, 0), { sx: 0, sy: 350, sw: 900, sh: 900 });
  assert.deepEqual(compositionCrop(900, 1600, 1, 100, 100), { sx: 0, sy: 700, sw: 900, sh: 900 });
  assert.deepEqual(compositionCrop(1600, 900, 16 / 9, 100, 100), { sx: 0, sy: 0, sw: 1600, sh: 900 });
});

test('pan is clamped, nonfinite pan has defined behavior, and extreme aspect crops stay inside the image', () => {
  assert.deepEqual(compositionCrop(1600, 900, 1, -1000, Infinity), compositionCrop(1600, 900, 1, -100, 100));
  assert.deepEqual(compositionCrop(1600, 900, 1, NaN, -Infinity), compositionCrop(1600, 900, 1, 0, -100));
  for (const [width, height] of [[1, 100000], [100000, 1], [4032, 3024]]) {
    for (const aspect of [1 / 1000, 9 / 16, 1, 16 / 9, 1000]) {
      for (const pan of [-1000, 0, 1000]) {
        const crop = compositionCrop(width, height, aspect, pan, pan);
        near(crop.sw / crop.sh, aspect);
        assert.ok(crop.sw > 0 && crop.sh > 0);
        assert.ok(crop.sx >= 0 && crop.sy >= 0);
        assert.ok(crop.sx + crop.sw <= width + 1e-9);
        assert.ok(crop.sy + crop.sh <= height + 1e-9);
        assert.ok(crop.sw === width || crop.sh === height);
      }
    }
  }
  for (const args of [[0, 10, 1], [10, -1, 1], [10, 10, 0], [Infinity, 10, 1], [10, 10, NaN]]) {
    assert.throws(() => compositionCrop(...args), RangeError);
  }
});

test('mask uses display-encoded linear luminance and equality belongs to white', () => {
  const pixels = rgba([127, 127, 127, 255], [128, 128, 128, 255], [129, 129, 129, 255]);
  assert.deepEqual(levels(renderCompositionMask(pixels, 128, false)), [0, 255, 255]);
  for (const color of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [12, 40, 240], [255, 255, 255]]) {
    const gray = grayscaleValue(...color);
    assert.equal(renderCompositionMask(rgba([...color, 255]), gray, false)[0], 255);
    if (gray < 255) assert.equal(renderCompositionMask(rgba([...color, 255]), gray + 1, false)[0], 0);
  }
  const allGrays = rgba(...Array.from({ length: 256 }, (_, gray) => [gray, gray, gray, 255]));
  assert.deepEqual(levels(renderCompositionMask(allGrays, 128, false)), Array.from({ length: 256 }, (_, gray) => gray < 128 ? 0 : 255));
});

test('transparent pixels flatten on white and half-transparent black uses linear-light compositing', () => {
  const pixels = rgba([0, 0, 0, 0], [255, 0, 0, 0], [0, 0, 0, 128], [0, 0, 0, 255]);
  // 128/255 black over white has linear Y=127/255 and display gray=187.
  assert.deepEqual(levels(renderCompositionMask(pixels, 187, false)), [255, 255, 255, 0]);
  assert.deepEqual(levels(renderCompositionMask(pixels, 188, false)), [255, 255, 0, 0]);
  for (const threshold of [0, 128, 255]) {
    const mask = renderCompositionMask(pixels, threshold, false);
    for (let i = 3; i < mask.length; i += 4) assert.equal(mask[i], 255);
  }
});

test('inversion exchanges both mask colors and does not mutate the source', () => {
  const pixels = rgba([10, 20, 30, 0], [255, 0, 0, 128], [255, 255, 255, 255], [0, 0, 0, 255]);
  const before = new Uint8ClampedArray(pixels);
  const normal = renderCompositionMask(pixels, 160, false);
  const inverse = renderCompositionMask(pixels, 160, true);
  assert.notEqual(normal, pixels);
  assert.notEqual(inverse, pixels);
  for (let i = 0; i < normal.length; i++) assert.equal(inverse[i], i % 4 === 3 ? 255 : 255 - normal[i]);
  assert.deepEqual(pixels, before);
  assert.deepEqual(renderCompositionMask(rgba(), 128, false), rgba());
  assert.throws(() => renderCompositionMask(new Uint8ClampedArray(3), 128, false), RangeError);
});

test('mask threshold extremes and nonfinite fallback remain deterministic', () => {
  const pixels = rgba([0, 0, 0, 255], [127, 127, 127, 255], [128, 128, 128, 255], [255, 255, 255, 255]);
  assert.deepEqual(levels(renderCompositionMask(pixels, -100, false)), [255, 255, 255, 255]);
  assert.deepEqual(levels(renderCompositionMask(pixels, 1000, false)), [0, 0, 0, 255]);
  assert.deepEqual(renderCompositionMask(pixels, NaN, false), renderCompositionMask(pixels, 128, false));
});

test('thirds, golden grid, and diagonal guides have exact normalized placements', () => {
  for (const [kind, fractions] of [['thirds', [1 / 3, 2 / 3]], ['golden', [1 - 1 / GOLDEN_RATIO, 1 / GOLDEN_RATIO]]]) {
    const guide = compositionGuideGeometry(kind);
    assert.equal(guide.preserveAspectRatio, 'none');
    assert.equal(guide.paths.length, 4);
    fractions.forEach((fraction, index) => {
      const vertical = guide.paths[index * 2].match(/-?\d+(?:\.\d+)?/g).map(Number);
      const horizontal = guide.paths[index * 2 + 1].match(/-?\d+(?:\.\d+)?/g).map(Number);
      assert.deepEqual(vertical, [fraction * 1000, 0, fraction * 1000, 1000]);
      assert.deepEqual(horizontal, [0, fraction * 1000, 1000, fraction * 1000]);
    });
  }
  assert.deepEqual(compositionGuideGeometry('diagonals').paths, ['M 0 0 L 1000 1000', 'M 0 1000 L 1000 0']);
});

test('golden spiral stays bounded and its measured radius grows by phi every quarter turn', () => {
  const points = goldenSpiralPoints();
  assert.equal(points.length, 385);
  const measuredRadius = point => Math.hypot(point.x - GOLDEN_SPIRAL_CENTER.x, point.y - GOLDEN_SPIRAL_CENTER.y);
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    for (const value of Object.values(point)) assert.ok(Number.isFinite(value));
    assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
    near(measuredRadius(point), point.radius);
    if (index + 32 < points.length) {
      near(points[index + 32].angle - point.angle, Math.PI / 2);
      near(measuredRadius(points[index + 32]) / measuredRadius(point), GOLDEN_RATIO);
    }
    if (index > 0) assert.ok(point.radius > points[index - 1].radius);
  }
  near(points.at(-1).x, GOLDEN_SPIRAL_CENTER.x + points.at(-1).radius);
  near(points.at(-1).y, GOLDEN_SPIRAL_CENTER.y);
  const xBounds = [Math.min(...points.map(point => point.x)), Math.max(...points.map(point => point.x))];
  const yBounds = [Math.min(...points.map(point => point.y)), Math.max(...points.map(point => point.y))];
  near(xBounds[0] + xBounds[1], 1);
  near(yBounds[0] + yBounds[1], 1);
  near(Math.max(xBounds[1] - xBounds[0], yBounds[1] - yBounds[0]), 0.96);
  const guide = compositionGuideGeometry('spiral');
  assert.equal(guide.preserveAspectRatio, 'xMidYMid meet');
  assert.equal(guide.viewBox, '0 0 1000 1000');
  assert.deepEqual(guide.bounds, { x: 0, y: 0, width: 1000, height: 1000 });
  assert.equal(guide.paths.length, 1);
  assert.equal((guide.paths[0].match(/M /g) || []).length, 1);
  assert.equal((guide.paths[0].match(/L /g) || []).length, points.length - 1);
  assert.ok(!/NaN|Infinity/.test(guide.paths[0]));
});
