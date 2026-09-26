// Run with: node --test tests/paintedSphere.test.cjs
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
const { paintSpherePoint, spherePalette, SPHERE_LIGHT } = require('../src/lib/paintedSphere.ts');
const { colorFromHex, generateShadingScheme } = require('../src/lib/colorAnalysis.ts');
const { relativeLuminance } = require('../src/lib/utils.ts');

const fixtures = ['#BDA864', '#9DD5EE', '#643D86', '#FF0000', '#38A865', '#808080', '#000000', '#FFFFFF'];
const unit = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const paletteOf = (hex) => spherePalette(generateShadingScheme(colorFromHex(hex)));
const paint = (palette, normal, mode) => paintSpherePoint(palette, normal[0], normal[1], normal[2], mode);
const mirror = unit(SPHERE_LIGHT.x, SPHERE_LIGHT.y, SPHERE_LIGHT.z + 1);

// One normal inside each zone, with the light from the upper left (screen Y points down).
const places = {
  highlight: mirror,
  light: [SPHERE_LIGHT.x, SPHERE_LIGHT.y, SPHERE_LIGHT.z],
  midtone: unit(0.3, 0.1, 0.95),
  shadow: unit(0.5, 0.3, 0.81),
  shadowTone: unit(0.35, 0.85, 0.4),
  rim: [1, 0, 0],
};

test('every step of the painterly card has its own place on the sphere', () => {
  for (const hex of fixtures) {
    const palette = paletteOf(hex);
    for (const [role, normal] of Object.entries(places)) {
      for (const mode of ['steps', 'blend']) {
        assert.deepEqual(paint(palette, normal, mode), palette[role], `${hex} ${mode}: ${role}`);
      }
    }
  }
});

test('the midtone is exactly the picked color', () => {
  for (const hex of fixtures) {
    assert.deepEqual(paint(paletteOf(hex), places.midtone, 'steps'), colorFromHex(hex).rgb);
  }
});

test('the rim light stays on the shadow side and off the bottom', () => {
  const palette = paletteOf('#BDA864');
  assert.deepEqual(paint(palette, unit(-0.6, -0.8, 0), 'steps'), palette.light, 'the lit edge takes no rim');
  assert.deepEqual(paint(palette, [0, 1, 0], 'steps'), palette.shadowTone, 'the bottom edge takes no rim');
  assert.deepEqual(paint(palette, unit(1, 0.4, 0), 'steps'), palette.rim, 'the lower right edge is rim lit');
});

test('with steps, every point takes exactly one step color', () => {
  const palette = paletteOf('#643D86');
  const sphereSteps = ['highlight', 'light', 'midtone', 'shadowTone', 'shadow', 'rim'].map((role) => palette[role]);
  const seen = new Set();
  for (let y = -1; y <= 1; y += 0.02) {
    for (let x = -1; x <= 1; x += 0.02) {
      if (x * x + y * y > 1) continue;
      const color = paint(palette, [x, y, Math.sqrt(1 - x * x - y * y)], 'steps');
      const index = sphereSteps.findIndex((step) => step === color);
      assert.ok(index >= 0, `(${x.toFixed(2)}, ${y.toFixed(2)}) is not one step's color`);
      seen.add(index);
    }
  }
  assert.equal(seen.size, sphereSteps.length, 'every step shows somewhere on the sphere');
});

test('blending changes smoothly across the sphere and stays in range', () => {
  for (const hex of fixtures) {
    const palette = paletteOf(hex);
    // From the lit upper left, across the terminator to the rim on the right and down to the bottom,
    // in steps of about a tenth of a pixel on the card's sphere: a hard edge would jump far more.
    let previous = null;
    for (let step = 0; step <= 2400; step++) {
      const angle = -2.2 + step / 2400 * 3.8;
      const color = paint(palette, unit(Math.cos(angle) * 0.97, Math.sin(angle) * 0.97, 0.24), 'blend');
      for (const value of Object.values(color)) assert.ok(value >= 0 && value <= 255, `${hex}: ${value}`);
      if (previous) {
        const jump = Math.max(Math.abs(color.r - previous.r), Math.abs(color.g - previous.g), Math.abs(color.b - previous.b));
        assert.ok(jump < 6, `${hex}: a jump of ${jump.toFixed(1)} at ${angle.toFixed(3)} rad`);
      }
      previous = color;
    }
  }
});

test('the core shadow is the darkest band, and bounced light lifts the far side', () => {
  for (const hex of fixtures.filter((hex) => hex !== '#000000' && hex !== '#FFFFFF')) {
    const scheme = generateShadingScheme(colorFromHex(hex));
    const lum = (role) => relativeLuminance(scheme.find((step) => step.role === role).color.hex);
    assert.ok(lum('shadow') <= lum('shadowTone') + 1e-9, `${hex}: core ${lum('shadow')} over shadow tone ${lum('shadowTone')}`);
    assert.ok(lum('shadowTone') <= lum('midtone') + 1e-9, `${hex}: shadow tone over midtone`);
  }
});
