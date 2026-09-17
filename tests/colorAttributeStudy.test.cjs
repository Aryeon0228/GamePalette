const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { attributeColor, luminanceGray, preciseStudyHsl } = require('../src/lib/colorAttributeStudy.ts');
const { relativeLuminance, hexToRgb } = require('../src/lib/utils.ts');

test('equal HSL L does not claim equal relative luminance for yellow and blue', () => {
  const yellow = attributeColor({ h: 60, s: 100, l: 50 });
  const blue = attributeColor({ h: 240, s: 100, l: 50 });
  assert.equal(yellow.toUpperCase(), '#FFFF00');
  assert.equal(blue.toUpperCase(), '#0000FF');
  assert.ok(relativeLuminance(yellow) > relativeLuminance(blue) * 10);
  assert.notEqual(luminanceGray(yellow), luminanceGray(blue));
});

test('luminance grayscale preserves Y within one display-quantization step', () => {
  for (const color of ['#000000', '#FFFFFF', '#808080', '#FF0000', '#00FF00', '#0000FF', '#E59148', '#092543']) {
    const result = luminanceGray(color);
    const rgb = hexToRgb(result);
    assert.equal(rgb.r, rgb.g);
    assert.equal(rgb.g, rgb.b);
    assert.ok(Math.abs(relativeLuminance(color) - relativeLuminance(result)) < 0.005);
  }
  for (const color of ['#000000', '#FFFFFF', '#808080']) assert.equal(luminanceGray(color).toUpperCase(), color);
});

test('HSL endpoints are achromatic, saturation zero ignores hue, hue wraps', () => {
  for (const h of [0, 90, 240, 360, -120]) {
    assert.equal(attributeColor({ h, s: 100, l: 0 }).toUpperCase(), '#000000');
    assert.equal(attributeColor({ h, s: 100, l: 100 }).toUpperCase(), '#FFFFFF');
    assert.equal(attributeColor({ h, s: 0, l: 50 }).toUpperCase(), '#808080');
  }
  assert.equal(attributeColor({ h: 360, s: 100, l: 50 }), attributeColor({ h: 0, s: 100, l: 50 }));
});

test('editing hue preserves unedited saturation and lightness even near black and white', () => {
  for (const hex of ['#000001', '#FEFFFF', '#BC6146', '#010203', '#FDFEFF']) {
    const hsl = preciseStudyHsl(hex);
    assert.equal(attributeColor(hsl).toUpperCase(), hex);
    const adjusted = attributeColor({ ...hsl, h: 120 });
    assert.notEqual(adjusted.toUpperCase(), '#000000');
    assert.notEqual(adjusted.toUpperCase(), '#FFFFFF');
    const after = preciseStudyHsl(adjusted);
    assert.ok(Math.abs(after.l - hsl.l) < 0.001);
    assert.ok(Math.abs(after.s - hsl.s) < 0.001);
  }
});
