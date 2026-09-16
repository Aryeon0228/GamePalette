// Run with: node --test tests/colorExtractor.test.cjs
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
const { extractColors, extractColorsWithArea } = require('../src/lib/colorExtractor.ts');

const red = [255, 0, 0, 255];
const green = [0, 255, 0, 255];
const blue = [0, 0, 255, 255];
const transparent = [255, 255, 255, 0];
const pixels = (...groups) => new Uint8ClampedArray(groups.flat(2));
const repeat = (color, count) => Array.from({ length: count }, () => color);

// Exercise the public asynchronous image API with known canvas pixels. The
// mock also checks that drawImage and getImageData use actual canvas dimensions.
function mockImage(t, data, width = data.length / 4, height = 1) {
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const reads = [];
  globalThis.Image = class {
    width = width;
    height = height;
    set src(value) {
      assert.equal(typeof value, 'string');
      queueMicrotask(() => this.onload());
    }
  };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = {
        width: 0,
        height: 0,
        getContext(kind) {
          assert.equal(kind, '2d');
          return {
            drawImage(image, x, y, drawWidth, drawHeight) {
              assert.deepEqual([x, y, drawWidth, drawHeight], [0, 0, canvas.width, canvas.height]);
            },
            getImageData(x, y, readWidth, readHeight) {
              assert.deepEqual([x, y, readWidth, readHeight], [0, 0, canvas.width, canvas.height]);
              assert.ok(Number.isInteger(readWidth) && readWidth >= 1);
              assert.ok(Number.isInteger(readHeight) && readHeight >= 1);
              assert.equal(data.length, readWidth * readHeight * 4);
              reads.push([readWidth, readHeight]);
              return { data };
            },
          };
        },
      };
      return canvas;
    },
  };
  t.mock.method(Math, 'random', () => 0);
  t.after(() => {
    if (previousImage) Object.defineProperty(globalThis, 'Image', previousImage);
    else delete globalThis.Image;
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
  });
  return reads;
}

test('K-means reports 50/30/20 area shares attached to brightness-sorted colors', async t => {
  mockImage(t, pixels(repeat(red, 50), repeat(green, 30), repeat(blue, 20)), 10, 10);
  const result = await extractColorsWithArea('fixture:three-colors', 3, 'kmeans');
  assert.deepEqual(result.colors.map(color => color.hex), ['#00FF00', '#FF0000', '#0000FF']);
  assert.deepEqual(result.areaPercentages, [30, 50, 20]);
  assert.equal(result.areaPercentages.reduce((sum, value) => sum + value, 0), 100);
});

test('area measurement counts all pixels even when the training sample is 50/50 and the image is 75/25', async t => {
  const groups = Array.from({ length: 3000 }, (_, i) => i % 2 === 0
    ? [red, red, red, blue]
    : [blue, red, red, red]);
  mockImage(t, pixels(groups.flat()), 120, 100);
  const result = await extractColorsWithArea('fixture:sample-aliasing', 2, 'kmeans');
  assert.deepEqual(result.colors.map(color => color.hex), ['#FF0000', '#0000FF']);
  assert.deepEqual(result.areaPercentages, [75, 25]);
});

test('area measurement assigns unsampled shades to their nearest final centroid', async t => {
  const dark = [0, 0, 0, 255];
  const light = [200, 200, 200, 255];
  const nearerLight = [125, 125, 125, 255];
  const groups = Array.from({ length: 3000 }, (_, i) => [
    i % 2 === 0 ? dark : light, nearerLight, nearerLight, nearerLight,
  ]);
  mockImage(t, pixels(groups.flat()), 120, 100);
  const result = await extractColorsWithArea('fixture:nearest-centroid', 2, 'kmeans');
  assert.deepEqual(result.colors.map(color => color.hex), ['#C8C8C8', '#000000']);
  assert.deepEqual(result.areaPercentages, [87.5, 12.5]);
});

test('mostly transparent images use eligible pixels outside the old every-fourth sample and include alpha 128', async t => {
  const data = pixels(repeat(transparent, 16));
  data.set(red, 4);
  data.set([0, 0, 255, 128], 8);
  data.set([0, 255, 0, 127], 12);
  mockImage(t, data, 4, 4);
  const result = await extractColorsWithArea('fixture:transparency', 5, 'kmeans');
  assert.deepEqual(result.colors.map(color => color.hex), ['#FF0000', '#0000FF']);
  assert.deepEqual(result.areaPercentages, [50, 50]);
});

test('fully transparent images have no invented area measurement', async t => {
  mockImage(t, pixels(transparent, [20, 40, 60, 127]), 2, 1);
  const result = await extractColorsWithArea('fixture:empty', 5, 'kmeans');
  assert.equal(result.areaPercentages, null);
  assert.deepEqual(result.colors.map(color => color.hex), ['#808080']);
});

test('one-pixel images return one distinct color at 100% even when more colors are requested', async t => {
  mockImage(t, pixels(red), 1, 1);
  const result = await extractColorsWithArea('fixture:one-pixel', 5, 'kmeans');
  assert.deepEqual(result.colors.map(color => color.hex), ['#FF0000']);
  assert.deepEqual(result.areaPercentages, [100]);
});

test('many identical pixels do not create duplicate centroids or duplicate shares', async t => {
  mockImage(t, pixels(repeat(green, 100)), 10, 10);
  const result = await extractColorsWithArea('fixture:solid', 5, 'kmeans');
  assert.deepEqual(result.colors.map(color => color.hex), ['#00FF00']);
  assert.deepEqual(result.areaPercentages, [100]);
});

test('histogram extraction has no area shares and the legacy wrapper still returns its colors', async t => {
  mockImage(t, pixels(repeat(red, 4), repeat(blue, 4)), 8, 1);
  const result = await extractColorsWithArea('fixture:histogram', 2);
  assert.equal(result.areaPercentages, null);
  assert.deepEqual(await extractColors('fixture:histogram', 2), result.colors);
});

test('the legacy K-means wrapper returns the new API color array', async t => {
  mockImage(t, pixels(red, blue), 2, 1);
  const result = await extractColorsWithArea('fixture:wrapper', 2, 'kmeans');
  assert.deepEqual(await extractColors('fixture:wrapper', 2, 'kmeans'), result.colors);
});

for (const [width, height, expectedDimensions] of [
  [10000, 1, [200, 1]],
  [1, 10000, [1, 200]],
  [300, 2, [200, 1]],
]) {
  test(`resizing a ${width}×${height} image keeps positive integer analysis dimensions`, async t => {
    const reads = mockImage(t, pixels(repeat(red, 200)), width, height);
    const result = await extractColorsWithArea('fixture:thin', 2, 'kmeans');
    assert.deepEqual(reads, [expectedDimensions]);
    assert.deepEqual(result.areaPercentages, [100]);
  });
}
