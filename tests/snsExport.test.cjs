// Run with: node --test tests/snsExport.test.cjs
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
const { exportToSnsPng } = require('../src/lib/exporters.ts');

function recordingCanvas() {
  let points = [];
  const shapes = [];
  const labels = [];
  const bounds = () => ({
    x: Math.min(...points.map(([x]) => x)),
    y: Math.min(...points.map(([, y]) => y)),
    right: Math.max(...points.map(([x]) => x)),
    bottom: Math.max(...points.map(([, y]) => y)),
  });
  const context = {
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'top',
    beginPath() { points = []; },
    moveTo(x, y) { points.push([x, y]); },
    lineTo(x, y) { points.push([x, y]); },
    quadraticCurveTo(cx, cy, x, y) { points.push([cx, cy], [x, y]); },
    closePath() {}, stroke() {}, fillRect() {}, save() {}, restore() {}, drawImage() {},
    clip() { shapes.push({ ...bounds(), kind: 'image' }); },
    fill() { shapes.push({ ...bounds(), kind: 'fill', fill: this.fillStyle }); },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText(value) { return { width: value.length * parseFloat(this.font.match(/[\d.]+px/)[0]) * 0.65 }; },
    fillText(value, x, y) {
      const width = this.measureText(value).width;
      const height = parseFloat(this.font.match(/[\d.]+px/)[0]);
      if (this.textAlign === 'right') x -= width;
      if (this.textAlign === 'center') x -= width / 2;
      if (this.textBaseline === 'middle') y -= height / 2;
      if (this.textBaseline === 'bottom') y -= height;
      labels.push({ value, x, y, right: x + width, bottom: y + height });
    },
  };
  return { width: 0, height: 0, shapes, labels, getContext: () => context, toBlob: (callback) => callback(new Blob()) };
}

function overlaps(a, b) {
  return a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
}

test('SNS exports retain every full horizontal HEX, inside its cell, for 1–32 colors and both card ratios', async () => {
  const previousDocument = global.document;
  const previousImage = global.Image;
  global.Image = class {
    width = 600;
    height = 400;
    set src(value) { queueMicrotask(() => this.onload()); }
  };
  try {
    for (const snsCardType of ['instagram', 'twitter']) {
      for (let count = 1; count <= 32; count++) {
        for (const showHex of [false, true]) {
          for (const showStats of [false, true]) {
            for (const showHistogram of [false, true]) {
              for (const hasImage of [false, true]) {
                const canvas = recordingCanvas();
                global.document = { createElement: () => canvas };
                const palette = {
                  name: 'A very long palette title that would otherwise run underneath the image',
                  style: 'hypercasual',
                  colors: Array.from({ length: count }, (_, index) => ({
                    hex: `#${(0x123456 + index * 0x040404).toString(16).padStart(6, '0')}`,
                    rgb: { r: index * 7, g: 120, b: 160 },
                    hsl: { h: 100, s: 50, l: 50 },
                  })),
                  ...(hasImage ? { sourceImageUrl: 'test-image' } : {}),
                };
                await exportToSnsPng(palette, { snsCardType, showHex, showStats, showHistogram });
                assert.deepEqual([canvas.width, canvas.height], snsCardType === 'instagram' ? [1080, 1080] : [1600, 900]);
                const hexLabels = canvas.labels.filter(({ value }) => value.startsWith('#'));
                assert.deepEqual(hexLabels.map(({ value }) => value), showHex ? palette.colors.map(({ hex }) => hex.toUpperCase()) : []);
                const cells = canvas.shapes.filter(({ fill }) => fill === 'rgba(255,255,255,0.07)');
                const swatches = canvas.shapes.filter(({ fill }) => palette.colors.some(({ hex }) => hex === fill));
                assert.equal(swatches.length, count);
                const image = canvas.shapes.find(({ kind }) => kind === 'image');
                assert.equal(!!image, hasImage);
                for (const [index, label] of hexLabels.entries()) {
                  const cell = cells[index];
                  assert.ok(label.x > swatches[index].right, 'HEX must read beside its own swatch');
                  assert.ok(label.x >= cell.x && label.right <= cell.right && label.y >= cell.y && label.bottom <= cell.bottom, `HEX clipped for ${snsCardType}, ${count} colors`);
                }
                for (const label of canvas.labels) {
                  assert.ok(label.x >= 0 && label.right <= canvas.width && label.y >= 0 && label.bottom <= canvas.height, `${label.value} outside canvas`);
                  assert.ok(!image || !overlaps(label, image), `${label.value} overlaps source image`);
                }
                for (let index = 0; index < canvas.labels.length; index++) {
                  for (const other of canvas.labels.slice(index + 1)) assert.ok(!overlaps(canvas.labels[index], other), 'text labels overlap');
                }
                const stats = canvas.shapes.filter(({ fill }) => fill === 'rgba(255,255,255,0.13)');
                const bars = canvas.shapes.filter(({ fill }) => fill === 'rgba(96,165,250,0.9)');
                assert.equal(stats.length, showStats ? 3 : 0);
                assert.equal(bars.length, showHistogram ? 24 : 0);
                for (const shape of [...swatches, ...cells, ...stats, ...bars]) {
                  assert.ok(shape.x >= 0 && shape.right <= canvas.width && shape.y >= 0 && shape.bottom <= canvas.height);
                }
                for (const stat of stats) {
                  for (const other of [...swatches, ...bars]) assert.ok(!overlaps(stat, other), 'statistics overlap palette or histogram');
                }
              }
            }
          }
        }
      }
    }
  } finally {
    global.document = previousDocument;
    global.Image = previousImage;
  }
});
