// Run with: node --test tests/colorLightingStudy.test.cjs
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

const {
  buildColorLightingStudy, DEFAULT_COLOR_LIGHTING, getColorLightingSamples,
  lightingLinearToSrgb, lightingRgbToHex, sampleColorLighting,
  sampleLightingGround, srgbToLightingLinear, visibleLightingNormal,
} = require('../src/lib/colorLightingStudy.ts');

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('material remains exact when moving light or changing temperature, ground and illumination', () => {
  const initial = buildColorLightingStudy('#A8B5A2');
  const changed = buildColorLightingStudy('#A8B5A2', {
    azimuth: 78, elevation: 11, temperature: 'cool', groundHex: '#e47749',
    keyEnabled: false, ambientEnabled: false, specularEnabled: false,
  });
  assert.equal(changed.baseHex, '#A8B5A2');
  assert.deepEqual(initial.material, changed.material);
  assert.equal(lightingRgbToHex(changed.material), '#A8B5A2');
  assert.equal(buildColorLightingStudy('abc').baseHex, '#AABBCC');
  const replacement = buildColorLightingStudy('#643D86', initial.settings);
  assert.deepEqual(initial.direction, replacement.direction);
  assert.deepEqual(initial.light, replacement.light);
  assert.notDeepEqual(initial.material, replacement.material);
});

test('sRGB conversion is linear before shading and round-trips every channel byte', () => {
  close(srgbToLightingLinear(0.5), 0.21404114048223255);
  for (let byte = 0; byte <= 255; byte++) close(lightingLinearToSrgb(srgbToLightingLinear(byte / 255)), byte / 255);
  const study = buildColorLightingStudy('#808080', { ambientEnabled: false, specularEnabled: false });
  const sample = sampleColorLighting(study, study.direction);
  for (let channel = 0; channel < 3; channel++) close(sample.linear[channel], srgbToLightingLinear(128 / 255) * 0.86);
});

test('disabling all illumination produces black even with highlights enabled', () => {
  for (const hex of ['#000000', '#FFFFFF', '#FF0080', '#A8B5A2']) {
    const study = buildColorLightingStudy(hex, { keyEnabled: false, ambientEnabled: false, specularEnabled: true });
    for (const normal of [[0, 0, 1], [0, -1, 0], study.halfDirection]) {
      assert.deepEqual(sampleColorLighting(study, normal).linear, [0, 0, 0]);
    }
    assert.deepEqual(sampleLightingGround(study, 2, 3), [0, 0, 0]);
    assert.deepEqual(getColorLightingSamples(study), { lit: '#000000', dark: '#000000' });
  }
});

test('dielectric highlight follows the light and is independent of material pigment', () => {
  const red = buildColorLightingStudy('#FF0000', { ambientEnabled: false });
  const green = buildColorLightingStudy('#00FF00', { ambientEnabled: false });
  const a = sampleColorLighting(red, red.halfDirection);
  const b = sampleColorLighting(green, green.halfDirection);
  assert.deepEqual(a.specular, b.specular);
  assert.ok(a.specular[0] > 0);
  close(a.specular[0], a.specular[1]);
  close(a.specular[1], a.specular[2]);
  assert.notDeepEqual(a.diffuse, b.diffuse);
  const matte = buildColorLightingStudy('#FF0000', { ambientEnabled: false, specularEnabled: false });
  assert.deepEqual(sampleColorLighting(matte, matte.halfDirection).specular, [0, 0, 0]);
  const black = buildColorLightingStudy('#000000');
  const blackHighlight = sampleColorLighting(black, black.halfDirection);
  assert.deepEqual(blackHighlight.diffuse, [0, 0, 0]);
  assert.ok(blackHighlight.linear.every(value => value > 0));
});

test('neutral lighting never forces a blue shadow; light temperature affects the highlight', () => {
  const neutral = buildColorLightingStudy('#808080');
  const dark = sampleColorLighting(neutral, visibleLightingNormal(0.75, -0.5));
  close(dark.linear[0], dark.linear[1]);
  close(dark.linear[1], dark.linear[2]);
  const warm = buildColorLightingStudy('#808080', { temperature: 'warm' });
  const cool = buildColorLightingStudy('#808080', { temperature: 'cool' });
  const warmHighlight = sampleColorLighting(warm, warm.halfDirection).specular;
  const coolHighlight = sampleColorLighting(cool, cool.halfDirection).specular;
  assert.ok(warmHighlight[0] > warmHighlight[2]);
  assert.ok(coolHighlight[2] > coolHighlight[0]);
});

test('ground bounce depends on the ground, enters downward normals, and obeys the environment switch', () => {
  const red = buildColorLightingStudy('#FFFFFF', { groundHex: '#FF0000' });
  const blue = buildColorLightingStudy('#FFFFFF', { groundHex: '#0000FF' });
  const redLower = sampleColorLighting(red, [0, -1, 0]);
  const blueLower = sampleColorLighting(blue, [0, -1, 0]);
  assert.ok(redLower.environment[0] > redLower.environment[2]);
  assert.ok(blueLower.environment[2] > blueLower.environment[0]);
  assert.deepEqual(sampleColorLighting(red, [0, 1, 0]), sampleColorLighting(blue, [0, 1, 0]));
  assert.deepEqual(redLower.diffuse, blueLower.diffuse);
  const disabled = buildColorLightingStudy('#FFFFFF', { groundHex: '#FF0000', ambientEnabled: false });
  assert.deepEqual(sampleColorLighting(disabled, [0, -1, 0]).environment, [0, 0, 0]);
});

test('moving the light changes the lit side and gives a geometric ground shadow in the opposite direction', () => {
  const left = buildColorLightingStudy('#808080', { azimuth: -70 });
  const right = buildColorLightingStudy('#808080', { azimuth: 70 });
  const normal = visibleLightingNormal(-0.8, 0.1);
  assert.ok(sampleColorLighting(left, normal).directAmount > sampleColorLighting(right, normal).directAmount);
  for (const study of [left, right]) {
    const [lx, ly, lz] = study.direction;
    const shadow = sampleLightingGround(study, -lx / ly, -lz / ly);
    const brightGround = sampleLightingGround(study, lx / ly * 3, lz / ly * 3);
    assert.ok(shadow[0] < brightGround[0] * 0.4);
    close(Math.hypot(...study.direction), 1);
    close(Math.hypot(...study.halfDirection), 1);
  }
});

test('direct-light mask is geometric and does not depend on material, specular, or bounce', () => {
  const a = buildColorLightingStudy('#FF8000');
  const b = buildColorLightingStudy('#0030FF', { groundHex: '#FF00FF', specularEnabled: false, ambientEnabled: false, temperature: 'warm' });
  for (const [x, y] of [[0, 0], [-0.7, 0.4], [0.8, -0.5]]) {
    const normal = visibleLightingNormal(x, y);
    close(Math.hypot(...normal), 1);
    close(sampleColorLighting(a, normal).directAmount, sampleColorLighting(b, normal).directAmount);
  }
});

test('samples and radiance stay finite across material extremes and slider limits; settings are detached', () => {
  const before = { ...DEFAULT_COLOR_LIGHTING };
  for (const hex of ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '', '#bad-input']) {
    for (const azimuth of [-80, 0, 80, NaN]) {
      for (const elevation of [10, 80, Infinity]) {
        const study = buildColorLightingStudy(hex, { azimuth, elevation });
        for (const normal of [visibleLightingNormal(0, 0), visibleLightingNormal(-0.6, -0.6)]) {
          assert.ok(sampleColorLighting(study, normal).linear.every(value => Number.isFinite(value) && value >= 0));
        }
        for (const value of Object.values(getColorLightingSamples(study))) assert.match(value, /^#[0-9A-F]{6}$/);
        study.settings.azimuth = 0;
      }
    }
  }
  assert.deepEqual(DEFAULT_COLOR_LIGHTING, before);
});
