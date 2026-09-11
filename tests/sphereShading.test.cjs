// Run with: node --test tests/sphereShading.test.cjs
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
const { buildSphereShading, sampleSphereRamp } = require('../src/lib/sphereShading.ts');
const { colorFromHex } = require('../src/lib/colorAnalysis.ts');
const { relativeLuminance, hslToRgb, rgbToHex } = require('../src/lib/utils.ts');
const modes = ['normal', 'coldwarm'];
const fixtures = ['#A8B5A2', '#643D86', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#010000', '#FFFEFE', '#000000', '#FFFFFF', '#808080'];
const hueDistance = (from, to) => ((to - from + 540) % 360) - 180;
const hueInput = (hue) => { const rgb = hslToRgb(hue, 65, 45); return rgbToHex(rgb.r, rgb.g, rgb.b); };

function assertRgbBounded(rgb) {
  for (const value of Object.values(rgb)) {
    assert.equal(Number.isFinite(value), true);
    assert.ok(value >= 0 && value <= 255, `RGB channel out of bounds: ${value}`);
  }
}

function assertOrdered(study) {
  const brightness = study.ramp.map((color) => relativeLuminance(color.hex));
  for (let index = 1; index < brightness.length; index++) {
    assert.ok(brightness[index] + 0.004 >= brightness[index - 1], `${study.mode} ${study.base.hex}: lightness reversed at ${index}`);
  }
}

test('both modes anchor the material and midpoint to the exact picked color', () => {
  for (const mode of modes) {
    for (const hex of [...fixtures, 'abc', '#abc']) {
      const study = buildSphereShading(hex, mode);
      assert.equal(study.mode, mode);
      assert.deepEqual(study.base, colorFromHex(hex));
      assert.strictEqual(study.ramp[Math.floor(study.ramp.length / 2)], study.base);
      assert.deepEqual(sampleSphereRamp(study, 0), study.base.rgb);
      assert.deepEqual(sampleSphereRamp(study, -1), study.shadow.rgb);
      assert.deepEqual(sampleSphereRamp(study, 1), study.highlight.rgb);
    }
  }
});

test('a new picked color changes the lighting study without palette input', () => {
  for (const mode of modes) {
    const green = buildSphereShading('#38A865', mode);
    const violet = buildSphereShading('#643D86', mode);
    for (const role of ['base', 'light', 'shadow', 'highlight', 'bounce']) {
      assert.notEqual(green[role].hex, violet[role].hex, `${mode}: ${role} ignored the picked color`);
    }
    assert.notDeepEqual(green.ramp, violet.ramp);
  }
});

test('normal lighting preserves a material hue instead of introducing palette colors', () => {
  const study = buildSphereShading('#38A865', 'normal');
  for (const color of study.ramp) {
    assert.ok(color.rgb.g >= color.rgb.r && color.rgb.g >= color.rgb.b);
    assert.ok(Math.abs(hueDistance(study.base.hsl.h, color.hsl.h)) <= 2);
  }
  assert.ok(relativeLuminance(study.shadow.hex) < relativeLuminance(study.bounce.hex));
  assert.ok(relativeLuminance(study.bounce.hex) < relativeLuminance(study.base.hex));
  assert.ok(relativeLuminance(study.base.hex) < relativeLuminance(study.light.hex));
  assert.ok(relativeLuminance(study.light.hex) < relativeLuminance(study.highlight.hex));
});

test('normal neutral materials stay achromatic, and black/white never invert their lighting', () => {
  for (const mode of modes) {
    for (const hex of ['#000000', '#010101', '#080808', '#808080', '#FDFDFD', '#FFFFFF']) {
      const study = buildSphereShading(hex, mode);
      assertOrdered(study);
      for (const color of study.ramp) {
        if (mode === 'normal') {
          assert.equal(color.rgb.r, color.rgb.g);
          assert.equal(color.rgb.g, color.rgb.b);
        }
        assertRgbBounded(color.rgb);
      }
    }
    assert.equal(buildSphereShading('#000000', mode).shadow.hex, '#000000');
    assert.equal(buildSphereShading('#FFFFFF', mode).highlight.hex, '#FFFFFF');
  }
});

test('coldwarm gives neutral material warm illumination and cool shadow while keeping its base exact', () => {
  const study = buildSphereShading('#808080', 'coldwarm');
  assert.deepEqual(study.base.rgb, { r: 128, g: 128, b: 128 });
  assert.ok(study.light.rgb.r > study.light.rgb.b, 'neutral light should be warm');
  assert.ok(study.shadow.rgb.b > study.shadow.rgb.r, 'neutral shadow should be cool');
  assert.notEqual(study.light.hex, buildSphereShading('#808080', 'normal').light.hex);
  const nearNeutral = buildSphereShading('#808081', 'coldwarm');
  for (const role of ['light', 'shadow', 'highlight', 'bounce']) {
    for (const channel of ['r', 'g', 'b']) {
      assert.ok(Math.abs(study[role].rgb[channel] - nearNeutral[role].rgb[channel]) <= 3, 'near-gray hue must not cause a jump');
    }
  }
});

test('temperature lighting keeps value ordered, including saturated yellow and near-neutral endpoints', () => {
  for (const hex of fixtures) {
    const normal = buildSphereShading(hex, 'normal');
    const coldwarm = buildSphereShading(hex, 'coldwarm');
    assertOrdered(normal);
    assertOrdered(coldwarm);
    for (let index = 0; index < normal.ramp.length; index++) {
      assert.ok(Math.abs(relativeLuminance(normal.ramp[index].hex) - relativeLuminance(coldwarm.ramp[index].hex)) < 0.006, `${hex}: temperature changed the lighting value`);
    }
  }
});

test('coldwarm light moves toward warm orange and shadow toward cool blue through hue wrap', () => {
  const normal = buildSphereShading(hueInput(350), 'normal');
  const coldwarm = buildSphereShading(hueInput(350), 'coldwarm');
  assert.notEqual(coldwarm.light.hex, normal.light.hex);
  assert.notEqual(coldwarm.shadow.hex, normal.shadow.hex);
  const warmer = hueDistance(coldwarm.base.hsl.h, coldwarm.highlight.hsl.h);
  const cooler = hueDistance(coldwarm.base.hsl.h, coldwarm.shadow.hsl.h);
  assert.ok(warmer > 0 && warmer <= 34, `warm rotation: ${warmer}`);
  assert.ok(cooler < 0 && cooler >= -34, `cool rotation: ${cooler}`);
  assert.ok(coldwarm.highlight.hsl.h < 40, 'warming red should cross 360 toward orange');
});

test('temperature shifts stop at their poles instead of overshooting nearby orange or blue', () => {
  for (const hue of [37, 40, 43]) {
    const study = buildSphereShading(hueInput(hue), 'coldwarm');
    assert.ok(Math.abs(hueDistance(40, study.highlight.hsl.h)) <= 2, `warm pole overshoot for ${hue}`);
  }
  for (const hue of [217, 220, 223]) {
    const study = buildSphereShading(hueInput(hue), 'coldwarm');
    assert.ok(Math.abs(hueDistance(220, study.shadow.hsl.h)) <= 2, `cool pole overshoot for ${hue}`);
  }
});

test('ramp sampling is continuous, bounded, clamps endpoints and tolerates NaN', () => {
  for (const mode of modes) {
    for (const hex of [...fixtures, '', '#not-a-color']) {
      const study = buildSphereShading(hex, mode);
      for (let step = -100; step <= 100; step++) assertRgbBounded(sampleSphereRamp(study, step / 100));
      assert.deepEqual(sampleSphereRamp(study, -Infinity), study.shadow.rgb);
      assert.deepEqual(sampleSphereRamp(study, Infinity), study.highlight.rgb);
      assert.deepEqual(sampleSphereRamp(study, -100), study.shadow.rgb);
      assert.deepEqual(sampleSphereRamp(study, 100), study.highlight.rgb);
      assert.deepEqual(sampleSphereRamp(study, NaN), study.base.rgb);
      for (const position of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) {
        const left = sampleSphereRamp(study, position - 1e-6);
        const right = sampleSphereRamp(study, position + 1e-6);
        for (const key of ['r', 'g', 'b']) assert.ok(Math.abs(left[key] - right[key]) < 0.01);
      }
    }
  }
});

test('sampling returns detached RGB values without changing the study', () => {
  const study = buildSphereShading('#643D86', 'coldwarm');
  const before = structuredClone(study);
  for (const position of [-1, -0.3, 0, 0.4, 1]) sampleSphereRamp(study, position).r = 999;
  assert.deepEqual(study, before);
});
