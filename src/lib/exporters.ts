import { Palette, Color, ExportFormat } from '@/types';

export function exportToPng(palette: Palette): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const colorWidth = 200;
    const colorHeight = 200;
    const textHeight = 40;

    canvas.width = palette.colors.length * colorWidth;
    canvas.height = colorHeight + textHeight;

    // Draw colors
    palette.colors.forEach((color, index) => {
      const x = index * colorWidth;

      // Color swatch
      ctx.fillStyle = color.hex;
      ctx.fillRect(x, 0, colorWidth, colorHeight);

      // HEX text background
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x, colorHeight, colorWidth, textHeight);

      // HEX text
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(color.hex, x + colorWidth / 2, colorHeight + 25);
    });

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

export function exportToJson(palette: Palette): string {
  const exportData = {
    name: palette.name,
    colors: palette.colors.map(color => ({
      hex: color.hex,
      rgb: [color.rgb.r, color.rgb.g, color.rgb.b],
      name: color.name,
    })),
    style: palette.style,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

export function exportToCss(palette: Palette): string {
  const lines = [':root {'];

  palette.colors.forEach((color, index) => {
    lines.push(`  --palette-color-${index + 1}: ${color.hex};`);
  });

  lines.push('}');
  return lines.join('\n');
}

export function exportToScss(palette: Palette): string {
  const lines: string[] = [];

  palette.colors.forEach((color, index) => {
    lines.push(`$palette-color-${index + 1}: ${color.hex};`);
  });

  // Also add a map
  lines.push('');
  lines.push('$palette-colors: (');
  palette.colors.forEach((color, index) => {
    const comma = index < palette.colors.length - 1 ? ',' : '';
    lines.push(`  '${index + 1}': ${color.hex}${comma}`);
  });
  lines.push(');');

  return lines.join('\n');
}

export function exportToUnity(palette: Palette): string {
  const colorStrings = palette.colors.map(color => {
    const r = (color.rgb.r / 255).toFixed(3);
    const g = (color.rgb.g / 255).toFixed(3);
    const b = (color.rgb.b / 255).toFixed(3);
    return `        new Color(${r}f, ${g}f, ${b}f)`;
  }).join(',\n');

  return `// ${palette.name}.cs
using UnityEngine;

[CreateAssetMenu(fileName = "NewPalette", menuName = "GamePalette/Palette")]
public class ${palette.name.replace(/[^a-zA-Z0-9]/g, '')}Palette : ScriptableObject
{
    public string paletteName = "${palette.name}";
    public Color[] colors = new Color[] {
${colorStrings}
    };
}`;
}

export function exportToUnreal(palette: Palette): string {
  const colorStrings = palette.colors.map(color => {
    const r = (color.rgb.r / 255).toFixed(3);
    const g = (color.rgb.g / 255).toFixed(3);
    const b = (color.rgb.b / 255).toFixed(3);
    return `"(R=${r},G=${g},B=${b},A=1.0)"`;
  }).join(',');

  return `Name,${palette.colors.map((_, i) => `Color${i + 1}`).join(',')}
"${palette.name}",${colorStrings}`;
}

export function downloadFile(content: string | Blob, filename: string, mimeType?: string) {
  let blob: Blob;

  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type: mimeType || 'text/plain' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportPalette(palette: Palette, format: ExportFormat): Promise<void> {
  const safeName = palette.name.replace(/[^a-zA-Z0-9-_]/g, '_');

  switch (format) {
    case 'png': {
      const blob = await exportToPng(palette);
      downloadFile(blob, `${safeName}.png`);
      break;
    }
    case 'json': {
      const json = exportToJson(palette);
      downloadFile(json, `${safeName}.json`, 'application/json');
      break;
    }
    case 'css': {
      const css = exportToCss(palette);
      downloadFile(css, `${safeName}.css`, 'text/css');
      break;
    }
    case 'scss': {
      const scss = exportToScss(palette);
      downloadFile(scss, `${safeName}.scss`, 'text/x-scss');
      break;
    }
    case 'unity': {
      const unity = exportToUnity(palette);
      downloadFile(unity, `${safeName}Palette.cs`, 'text/plain');
      break;
    }
    case 'unreal': {
      const unreal = exportToUnreal(palette);
      downloadFile(unreal, `${safeName}.csv`, 'text/csv');
      break;
    }
  }
}
