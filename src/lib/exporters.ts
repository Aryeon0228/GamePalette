import { Palette, Color, ExportFormat } from '@/types';

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export type SnsCardType = 'instagram' | 'twitter';

export interface PngExportOptions {
  mode?: 'moodboard' | 'sns';
  snsCardType?: SnsCardType;
  showHex?: boolean;
  showStats?: boolean;
  showHistogram?: boolean;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
}

function getLuminance(color: Color): number {
  return Math.round(0.299 * color.rgb.r + 0.587 * color.rgb.g + 0.114 * color.rgb.b);
}

function buildLuminanceBins(colors: Color[], binCount: number = 20): number[] {
  const bins = Array.from({ length: binCount }, () => 0);
  if (colors.length === 0) return bins;

  for (const color of colors) {
    const luminance = getLuminance(color);
    const index = Math.min(binCount - 1, Math.floor((luminance / 256) * binCount));
    bins[index] += 1;
  }

  return bins;
}

async function renderSourceImage(
  ctx: CanvasRenderingContext2D,
  sourceImageUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): Promise<void> {
  const image = new Image();
  image.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load source image'));
    image.src = sourceImageUrl;
  });

  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  const imgAspect = image.width / image.height;
  const boxAspect = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (imgAspect > boxAspect) {
    drawHeight = height;
    drawWidth = height * imgAspect;
    offsetX = x - (drawWidth - width) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / imgAspect;
    offsetY = y - (drawHeight - height) / 2;
  }
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();

  roundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function exportToPng(palette: Palette): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Layout configuration
    const padding = 48;
    const headerHeight = 60;
    const swatchSize = 100;
    const swatchGap = 16;
    const infoWidth = 180;
    const colorRowHeight = swatchSize + swatchGap;
    const imageSize = 280;

    const colorCount = palette.colors.length;
    const hasImage = !!palette.sourceImageUrl;

    // Calculate canvas dimensions
    const rightSectionWidth = swatchSize + infoWidth + 24;
    const rightSectionHeight = colorCount * colorRowHeight - swatchGap;

    const contentHeight = hasImage
      ? Math.max(imageSize, rightSectionHeight)
      : rightSectionHeight;

    const canvasWidth = hasImage
      ? padding * 2 + imageSize + 48 + rightSectionWidth
      : padding * 2 + rightSectionWidth + 100;
    const canvasHeight = padding + headerHeight + contentHeight + padding;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Background - clean neutral gray
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Subtle border
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvasWidth - 1, canvasHeight - 1);

    // Header - Palette name
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(palette.name, padding, padding + headerHeight / 2);

    // Decorative line under header
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(padding, padding + headerHeight - 8, canvasWidth - padding * 2, 1);

    const contentStartY = padding + headerHeight + 16;

    // Helper function to draw color swatches and info
    const drawColors = (startX: number) => {
      palette.colors.forEach((color, index) => {
        const y = contentStartY + index * colorRowHeight;

        // Color swatch with rounded corners
        roundRect(ctx, startX, y, swatchSize, swatchSize, 12);
        ctx.fillStyle = color.hex;
        ctx.fill();

        // Subtle shadow effect
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Color info section
        const infoX = startX + swatchSize + 20;

        // HEX value (large, bold)
        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 18px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(color.hex.toUpperCase(), infoX, y + 8);

        // RGB value
        ctx.fillStyle = '#666666';
        ctx.font = '14px ui-monospace, monospace';
        ctx.fillText(
          `RGB  ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`,
          infoX,
          y + 34
        );

        // HSL value
        ctx.fillText(
          `HSL  ${Math.round(color.hsl.h)}°, ${Math.round(color.hsl.s)}%, ${Math.round(color.hsl.l)}%`,
          infoX,
          y + 54
        );

        // Color name if available
        if (color.name) {
          ctx.fillStyle = '#999999';
          ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
          ctx.fillText(color.name, infoX, y + 76);
        }
      });
    };

    // If there's a source image, load and draw it
    if (hasImage && palette.sourceImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Draw image container with shadow
        const imgX = padding;
        const imgY = contentStartY;

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Image background
        roundRect(ctx, imgX, imgY, imageSize, imageSize, 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Clip and draw image
        ctx.save();
        roundRect(ctx, imgX, imgY, imageSize, imageSize, 12);
        ctx.clip();

        // Calculate aspect ratio fit
        const imgAspect = img.width / img.height;
        let drawWidth = imageSize;
        let drawHeight = imageSize;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > 1) {
          drawHeight = imageSize / imgAspect;
          offsetY = (imageSize - drawHeight) / 2;
        } else {
          drawWidth = imageSize * imgAspect;
          offsetX = (imageSize - drawWidth) / 2;
        }

        ctx.drawImage(img, imgX + offsetX, imgY + offsetY, drawWidth, drawHeight);
        ctx.restore();

        // Draw border around image
        roundRect(ctx, imgX, imgY, imageSize, imageSize, 12);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw color swatches
        const colorsStartX = padding + imageSize + 48;
        drawColors(colorsStartX);

        // Footer - watermark
        ctx.fillStyle = '#BBBBBB';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Made with Pixel Paw', canvasWidth - padding, canvasHeight - 16);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };

      img.onerror = () => {
        // If image fails to load, draw without it
        const colorsStartX = padding;
        drawColors(colorsStartX);

        ctx.fillStyle = '#BBBBBB';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Made with Pixel Paw', canvasWidth - padding, canvasHeight - 16);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };

      img.src = palette.sourceImageUrl;
    } else {
      // No source image - centered color layout
      const colorsStartX = (canvasWidth - rightSectionWidth) / 2;
      drawColors(colorsStartX);

      // Footer - watermark
      ctx.fillStyle = '#BBBBBB';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Made with Pixel Paw', canvasWidth - padding, canvasHeight - 16);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    }
  });
}

export async function exportToSnsPng(
  palette: Palette,
  options: PngExportOptions = {}
): Promise<Blob> {
  const cardType: SnsCardType = options.snsCardType ?? 'instagram';
  const showHex = options.showHex ?? true;
  const showStats = options.showStats ?? true;
  const showHistogram = options.showHistogram ?? true;

  const width = cardType === 'twitter' ? 1600 : 1080;
  const height = cardType === 'twitter' ? 900 : 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const padding = cardType === 'twitter' ? 56 : 64;
  const topAreaHeight = cardType === 'twitter' ? 360 : 420;
  const stripHeight = cardType === 'twitter' ? 180 : 220;
  const bottomAreaTop = padding + topAreaHeight + 24 + stripHeight + 24;
  const contentWidth = width - padding * 2;
  const sourceImageSize = cardType === 'twitter' ? 320 : 360;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#121417');
  gradient.addColorStop(1, '#1E2329');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, padding, padding, contentWidth, height - padding * 2, 26);
  ctx.fill();

  ctx.fillStyle = '#F9FAFB';
  ctx.font = `700 ${cardType === 'twitter' ? 52 : 56}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(palette.name || 'Pixel Paw', padding + 28, padding + 24);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 ${cardType === 'twitter' ? 22 : 24}px ui-sans-serif, system-ui`;
  ctx.fillText(
    `${palette.colors.length} colors`,
    padding + 28,
    padding + (cardType === 'twitter' ? 94 : 100)
  );

  const imageX = width - padding - sourceImageSize - 28;
  const imageY = padding + 24;
  if (palette.sourceImageUrl) {
    try {
      await renderSourceImage(ctx, palette.sourceImageUrl, imageX, imageY, sourceImageSize, sourceImageSize, 18);
    } catch {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, imageX, imageY, sourceImageSize, sourceImageSize, 18);
      ctx.fill();
    }
  }

  const stripY = padding + topAreaHeight + 24;
  const colors = palette.colors.slice(0, 8);
  const swatchGap = 10;
  const swatchWidth = (contentWidth - swatchGap * (colors.length - 1)) / Math.max(colors.length, 1);
  colors.forEach((color, index) => {
    const x = padding + index * (swatchWidth + swatchGap);
    roundRect(ctx, x, stripY, swatchWidth, stripHeight, 16);
    ctx.fillStyle = color.hex;
    ctx.fill();

    if (showHex) {
      ctx.fillStyle = getLuminance(color) > 140 ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.94)';
      ctx.font = `700 ${cardType === 'twitter' ? 22 : 24}px ui-monospace, SFMono-Regular, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.hex.toUpperCase(), x + swatchWidth / 2, stripY + stripHeight / 2);
    }
  });

  if (showStats) {
    const chipY = bottomAreaTop;
    const averageLuminance =
      colors.length > 0
        ? Math.round(colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length)
        : 0;
    const chips = [
      `Style: ${palette.style}`,
      `Avg Luma: ${averageLuminance}`,
      `Export: ${cardType === 'twitter' ? '16:9' : '1:1'}`,
    ];

    let chipX = padding;
    for (const chip of chips) {
      ctx.font = `600 ${cardType === 'twitter' ? 20 : 21}px ui-sans-serif, system-ui`;
      const textWidth = ctx.measureText(chip).width;
      const chipWidth = textWidth + 28;
      roundRect(ctx, chipX, chipY, chipWidth, 42, 21);
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.fill();

      ctx.fillStyle = '#F3F4F6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(chip, chipX + 14, chipY + 21);

      chipX += chipWidth + 10;
    }
  }

  if (showHistogram) {
    const graphHeight = cardType === 'twitter' ? 120 : 132;
    const graphY = height - padding - graphHeight - 18;
    const graphWidth = contentWidth;
    const bins = buildLuminanceBins(colors, 24);
    const maxBin = Math.max(...bins, 1);
    const barGap = 4;
    const barWidth = (graphWidth - barGap * (bins.length - 1)) / bins.length;

    roundRect(ctx, padding, graphY - 26, graphWidth, graphHeight + 36, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    bins.forEach((value, index) => {
      const normalized = value / maxBin;
      const barHeight = Math.max(4, normalized * graphHeight);
      const x = padding + index * (barWidth + barGap);
      const y = graphY + graphHeight - barHeight;
      ctx.fillStyle = 'rgba(96,165,250,0.9)';
      roundRect(ctx, x, y, barWidth, barHeight, 4);
      ctx.fill();
    });
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 ${cardType === 'twitter' ? 18 : 20}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Made with Pixel Paw', width - padding - 12, height - padding - 10);

  return toBlob(canvas);
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

[CreateAssetMenu(fileName = "NewPalette", menuName = "PixelPaw/Palette")]
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

export async function exportPalette(
  palette: Palette,
  format: ExportFormat,
  pngOptions: PngExportOptions = {}
): Promise<void> {
  const safeName = palette.name.replace(/[^a-zA-Z0-9-_]/g, '_');

  switch (format) {
    case 'png': {
      const blob =
        pngOptions.mode === 'sns'
          ? await exportToSnsPng(palette, pngOptions)
          : await exportToPng(palette);
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
