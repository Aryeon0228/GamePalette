"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { IoAddOutline, IoCheckmarkOutline, IoCopyOutline, IoDownloadOutline } from "react-icons/io5"
import { ColorChannelBar } from "@/components/ColorChannelBar"
import { HarmonyWheel } from "@/components/HarmonyWheel"
import {
  bestTextColor,
  colorFromHex,
  colorTemperature,
  contrastReport,
  EASING_NAMES,
  generateGradientPalette,
  generateShades,
  generateShadingScheme,
  generateTints,
  generateTones,
  hueFamily,
  type EasingName,
  type GradientPartner,
} from "@/lib/colorAnalysis"
import { generateColdwarmGrid, hueShiftForIntensity, type ColdwarmIntensity } from "@/lib/coldwarm"
import { colorToAllFormatsText, colorToCss, colorToJson } from "@/lib/colorExport"
import { COLOR_FORMATS, formatColor, getChannels, type ColorFormat } from "@/lib/colorFormats"
import { generateColorHarmonies, simulateColorBlindness, type HarmonyType } from "@/lib/colorVision"
import { downloadFile } from "@/lib/exporters"
import { cn, copyToClipboard } from "@/lib/utils"
import "./ColorLabToolsOverview.css"

export interface ColorLabToolsProps {
  hex: string
  mode: "compose" | "analyze"
  onSelectColor: (hex: string) => void
  onAddColors?: (hexes: string[]) => void
  overview?: boolean
  extraCard?: ReactNode
}

type ComposeTool = "shading" | "ramps" | "gradient" | "harmony" | "coldwarm"
type AnalyzeTool = "formats" | "contrast" | "vision" | "meaning"
const HARMONY_KEY: Record<HarmonyType, string> = {
  complementary: "complementary", analogous: "analogous", triadic: "triadic",
  "split-complementary": "split", tetradic: "tetradic",
}
const HARMONY_ROLE_KEY: Record<string, string> = {
  Base: "roleBase", Complement: "roleComplement", Left: "roleLeft", Right: "roleRight",
  Second: "roleSecond", Third: "roleThird", Fourth: "roleFourth", "Split 1": "roleSplit1", "Split 2": "roleSplit2",
}
const CVD_TYPES = ["protanopia", "deuteranopia", "tritanopia"] as const
const CHANNEL_FORMATS = COLOR_FORMATS.filter((format) => format !== "HEX")
const CONTROL = "inline-flex min-h-9 items-center justify-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"

function ToolSection({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Choice<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (value: T) => void; label: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(CONTROL, value === option.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
        >{option.label}</button>
      ))}
    </div>
  )
}

/** Controlled tools for the shared workspace. Generated swatches always select; copying is explicit. */
export function ColorLabTools({ hex, mode, onSelectColor, onAddColors, overview = false, extraCard }: ColorLabToolsProps) {
  const t = useTranslations("analyzer")
  const th = useTranslations("harmony")
  const tc = useTranslations("coldwarm")
  const isKo = useLocale().startsWith("ko")
  const label = (ko: string, en: string) => isKo ? ko : en
  const [composeTool, setComposeTool] = useState<ComposeTool>("shading")
  const [analyzeTool, setAnalyzeTool] = useState<AnalyzeTool>("formats")
  const [format, setFormat] = useState<ColorFormat>("RGB")
  const [harmony, setHarmony] = useState<HarmonyType>("complementary")
  const [gradientStops, setGradientStops] = useState(7)
  const [gradientEasing, setGradientEasing] = useState<EasingName>("sinusoidal")
  const [gradientPartner, setGradientPartner] = useState<GradientPartner>("complement")
  const [intensity, setIntensity] = useState<ColdwarmIntensity>("normal")
  const [copied, setCopied] = useState<string | null>(null)
  const [inspectedColors, setInspectedColors] = useState<Record<string, string>>({})
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const color = useMemo(() => colorFromHex(hex), [hex])
  const shading = useMemo(() => generateShadingScheme(color), [color])
  const ramps = useMemo(() => ({ tints: generateTints(color), shades: generateShades(color), tones: generateTones(color) }), [color])
  const gradient = useMemo(() => generateGradientPalette(color, {
    stops: gradientStops, easing: gradientEasing, partner: gradientPartner,
  }), [color, gradientStops, gradientEasing, gradientPartner])
  const harmonies = useMemo(() => generateColorHarmonies(color.hex), [color])
  const activeHarmony = harmonies.find((item) => item.type === harmony) ?? harmonies[0]
  const channels = useMemo(() => getChannels(color, format), [color, format])
  const grid = useMemo(() => generateColdwarmGrid(color, {
    steps: 4, maxHueShift: hueShiftForIntensity(intensity),
  }), [color, intensity])
  const family = hueFamily(color)
  const textColor = bestTextColor(color.hex)

  const handleCopy = async (value: string, token: string) => {
    try {
      await copyToClipboard(value)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      setCopied(token)
      copyTimer.current = setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied("error")
    }
  }

  const renderCopyButton = ({ value, token, compact = false }: { value: string; token: string; compact?: boolean }) => (
    <button type="button" onClick={() => handleCopy(value, token)}
      aria-label={`${label("복사", "Copy")} ${value}`}
      title={`${label("복사", "Copy")} ${value}`}
      className={cn(CONTROL, compact ? "min-h-8 border-0 px-2 py-1" : "")}
    >
      {copied === token ? <IoCheckmarkOutline className="h-3.5 w-3.5" /> : <IoCopyOutline className="h-3.5 w-3.5" />}
      {!compact && (copied === token ? label("복사됨", "Copied") : label("복사", "Copy"))}
    </button>
  )

  const renderAddSet = ({ colors, text }: { colors: Array<{ hex: string }>; text?: string }) => onAddColors ? (
    <button type="button" className={cn(CONTROL, "shrink-0 text-primary")}
      onClick={() => onAddColors(Array.from(new Set(colors.map((item) => item.hex.toUpperCase()))))}
    >
      <IoAddOutline className="h-4 w-4" />
      {text ?? label("팔레트에 색상 세트 추가", "Add set to palette")}
      <span className="font-mono text-[10px] text-muted-foreground">{new Set(colors.map((item) => item.hex.toUpperCase())).size}</span>
    </button>
  ) : null

  const renderSwatches = ({ colors, roles, token, compact = false }: {
    colors: Array<{ hex: string }>; roles?: string[]; token: string; compact?: boolean
  }) => (
    <div className={cn("grid gap-px border border-border bg-border", colors.length > 7 ? "grid-cols-3 sm:grid-cols-6" : colors.length === 7 ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-7" : colors.length === 6 ? "grid-cols-3 sm:grid-cols-6" : colors.length === 5 ? "grid-cols-3 sm:grid-cols-5" : colors.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}
      style={colors.length < 4 ? { gridTemplateColumns: `repeat(${colors.length}, minmax(0, 1fr))` } : undefined}
    >
      {colors.map((item, index) => (
        <div key={`${token}-${index}`} className="min-w-0 bg-background">
          <button type="button" onClick={() => onSelectColor(item.hex)}
            aria-label={`${label("현재 색상으로 선택", "Select as current color")} ${item.hex}${roles ? ` · ${roles[index]}` : ""}`}
            title={`${label("색상 선택", "Select color")} ${item.hex}`}
            className={cn("block w-full border-0 transition-opacity hover:opacity-85 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary", compact ? "h-16" : "h-28 sm:h-36")}
            style={{ backgroundColor: item.hex }}
          />
          <div className="flex min-w-0 items-center justify-between gap-0.5 px-2 py-1.5">
            <div className="min-w-0">
              {roles && <p className="truncate text-[10px] text-muted-foreground" title={roles[index]}>{roles[index]}</p>}
              <p className="truncate font-mono text-[10px] sm:text-[11px]">{item.hex.toUpperCase()}</p>
            </div>
            {renderCopyButton({ compact: true, value: item.hex, token: `${token}-${index}` })}
          </div>
        </div>
      ))}
    </div>
  )

  const composeOptions: Array<{ value: ComposeTool; label: string }> = [
    { value: "shading", label: label("라이팅", "Lighting") },
    { value: "ramps", label: label("명암 · 톤", "Tints & tones") },
    { value: "gradient", label: label("그라디언트", "Gradient") },
    { value: "harmony", label: label("색상 조화", "Harmony") },
    { value: "coldwarm", label: label("한난 대비", "Cold & warm") },
  ]
  const analyzeOptions: Array<{ value: AnalyzeTool; label: string }> = [
    { value: "formats", label: label("색상 값", "Color values") },
    { value: "contrast", label: label("대비 · 가독성", "Contrast") },
    { value: "vision", label: label("색각 시뮬레이션", "Color vision") },
    { value: "meaning", label: label("이름 · 심리", "Name & meaning") },
  ]

  const renderCompactCopy = (value: string, token: string, text?: string) => (
    <button type="button" className="overview-action" aria-label={`${label("복사", "Copy")} ${text ?? value}`} title={`${label("복사", "Copy")} ${value}`} onClick={() => handleCopy(value, token)}>
      {copied === token ? <IoCheckmarkOutline /> : <IoCopyOutline />}{text}
    </button>
  )
  const renderCompactAdd = (colors: Array<{ hex: string }>, text?: string) => onAddColors ? (
    <button type="button" className="overview-action overview-add" title={text ?? label("색상 세트를 팔레트에 추가", "Add this color set to your palette")} onClick={() => onAddColors(Array.from(new Set(colors.map((item) => item.hex.toUpperCase()))))}>
      <IoAddOutline />{text ?? label("세트 추가", "Add set")}
    </button>
  ) : null
  const renderCompactCard = (title: string, children: ReactNode, action?: ReactNode, className?: string) => (
    <section className={cn("overview-tool", className)}>
      <div className="overview-tool-heading"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  )
  const renderCompactStrip = (colors: Array<{ hex: string }>, token: string, options: { roles?: string[]; shortRoles?: string[]; height?: number; extraAction?: ReactNode } = {}) => {
    const inspected = colors.find((item) => item.hex === inspectedColors[token])?.hex ?? colors[0]?.hex ?? color.hex
    return <div className="overview-strip-block">
      <div className="overview-strip" style={{ gridTemplateColumns: `repeat(${colors.length}, minmax(0, 1fr))` }}>
        {colors.map((item, index) => <div key={`${token}-${index}`}>
          <button type="button" className="overview-swatch" style={{ background: item.hex, height: options.height ?? 40 }}
            title={`${options.roles?.[index] ? `${options.roles[index]} · ` : ""}${item.hex}`}
            aria-label={`${label("색상 선택", "Select color")} ${item.hex}${options.roles?.[index] ? ` · ${options.roles[index]}` : ""}`}
            onFocus={() => setInspectedColors((previous) => ({ ...previous, [token]: item.hex }))}
            onMouseEnter={() => setInspectedColors((previous) => ({ ...previous, [token]: item.hex }))}
            onClick={() => onSelectColor(item.hex)} />
          {options.shortRoles && <span className="overview-role" title={options.roles?.[index]}>{options.shortRoles[index]}</span>}
        </div>)}
      </div>
      <div className="overview-strip-meta"><span className="overview-inspected">{renderCompactCopy(inspected, `${token}-color`, inspected)}</span>{renderCompactCopy(colors.map((item) => item.hex).join(", "), `${token}-set`, label("세트 복사", "Copy set"))}{options.extraAction}</div>
    </div>
  }
  const renderCompactSelect = <T extends string | number,>(value: T, values: T[], onChange: (value: T) => void, title: string, optionLabel: (value: T) => string | number = (item) => item) => (
    <label className="overview-select"><span>{title}</span><select value={value} onChange={(event) => onChange((typeof value === "number" ? Number(event.target.value) : event.target.value) as T)}>{values.map((item) => <option value={item} key={item}>{optionLabel(item)}</option>)}</select></label>
  )

  if (overview) {
    return <div className={cn("color-tools-overview", mode === "compose" ? "overview-compose" : "overview-analysis")}>
      <p className="sr-only" role="status" aria-live="polite">{copied === "error" ? label("복사하지 못했습니다.", "Copy failed.") : copied ? label("클립보드에 복사했습니다.", "Copied to clipboard.") : ""}</p>
      {mode === "compose" ? <>
        {renderCompactCard(t("shadingTitle"), <>
          {renderCompactStrip(shading.map((step) => step.color), "overview-shading", { roles: shading.map((step) => t(`shade.${step.role}`)), shortRoles: isKo ? ["빛점", "밝음", "중간", "음영", "그림자", "역광", "배경"] : ["HIGH", "LIGHT", "MID", "SHADE", "DARK", "RIM", "BG"], height: 44 })}
          <div className="overview-shading-key">{shading.map((step) => <div key={step.role}><span className="overview-dot" style={{ background: step.color.hex }} /><span>{t(`shade.${step.role}`)}</span>{renderCompactCopy(step.color.hex, `overview-role-${step.role}`, step.color.hex)}</div>)}</div>
        </>, renderCompactAdd(shading.map((step) => step.color)))}
        {renderCompactCard(t("rampsTitle"), <div className="overview-ramps">
          {(["tints", "shades", "tones"] as const).map((ramp) => <div key={ramp}><div className="overview-row-heading"><h4>{t(ramp)}</h4></div>{renderCompactStrip(ramps[ramp], `overview-${ramp}`, { height: 30, extraAction: renderCompactAdd(ramps[ramp]) })}</div>)}
        </div>)}
        {renderCompactCard(t("gradientTitle"), <>
          <div className="overview-gradient-controls">
            {renderCompactSelect(gradientPartner, ["complement", "analogous", "triad"], setGradientPartner, t("partner"), (value) => t(`gradPartner.${value}`))}
            {renderCompactSelect(gradientEasing, EASING_NAMES, setGradientEasing, t("easing"), (value) => t(`gradEasing.${value}`))}
            {renderCompactSelect(gradientStops, [5, 7, 9, 12], setGradientStops, t("stops"))}
          </div>
          <div className="overview-gradient" aria-hidden style={{ background: `linear-gradient(to right, ${gradient.map((item) => item.hex).join(", ")})` }} />
          {renderCompactStrip(gradient, "overview-gradient", { height: 40 })}
          <p className="overview-note">{label("짝 색상과 곡선을 바꾸며 색의 흐름을 조절하세요.", "Change the partner and curve to shape the color flow.")}</p>
        </>, renderCompactAdd(gradient))}
        {renderCompactCard(t("harmonyTitle"), <>
          {renderCompactSelect(harmony, harmonies.map((item) => item.type), setHarmony, label("조화 방식", "Harmony"), (value) => th(`${HARMONY_KEY[value]}Name`))}
          <div className="overview-harmony"><HarmonyWheel baseHue={color.hsl.h} colors={activeHarmony.colors.map((item) => ({ hex: item.hex, angle: item.angle }))} size={96} /><div className="overview-harmony-colors">{activeHarmony.colors.map((item, index) => <div key={index}><button type="button" className="overview-harmony-pick" onClick={() => onSelectColor(item.hex)} aria-label={`${label("색상 선택", "Select color")} ${item.hex}`}><span style={{ background: item.hex }} /><span>{th(HARMONY_ROLE_KEY[item.name] ?? "roleBase")}</span></button>{renderCompactCopy(item.hex, `overview-harmony-${index}`, item.hex.toUpperCase())}</div>)}</div></div>
          <p className="overview-note">{th(`${HARMONY_KEY[activeHarmony.type]}Desc`)}</p>
        </>, renderCompactAdd(activeHarmony.colors))}
        {renderCompactCard(t("coldwarmTitle"), <div className="overview-coldwarm">
          <div className="overview-coldwarm-map"><div className="overview-axis"><span>← {tc("cold")}</span><span>{tc("warm")} →</span></div><div className="overview-coldwarm-grid" style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}>{grid.rows.flat().map((cell) => <button type="button" key={`${cell.tempStep}:${cell.valueStep}`} title={`${cell.color.hex} · H${cell.color.hsl.h} S${cell.color.hsl.s} L${cell.color.hsl.l}`} aria-label={`${label("색상 선택", "Select color")} ${cell.color.hex}`} className={cn("overview-swatch", cell.isBase && "is-base")} style={{ background: cell.color.hex }} onMouseEnter={() => setInspectedColors((previous) => ({ ...previous, coldwarm: cell.color.hex }))} onFocus={() => setInspectedColors((previous) => ({ ...previous, coldwarm: cell.color.hex }))} onClick={() => onSelectColor(cell.color.hex)} />)}</div></div>
          <div className="overview-coldwarm-controls">{renderCompactSelect(intensity, ["subtle", "normal", "strong"], setIntensity, label("강도", "Strength"), (value) => tc(value))}<p className="overview-note">↑ {tc("light")}<br />↓ {tc("dark")}</p>{renderCompactCopy(grid.rows.flat().find((cell) => cell.color.hex === inspectedColors.coldwarm)?.color.hex ?? color.hex, "overview-coldwarm-copy", grid.rows.flat().find((cell) => cell.color.hex === inspectedColors.coldwarm)?.color.hex ?? color.hex)}<span className="overview-note">{label("가운데 행을 추가합니다.", "Adds the middle row.")}</span></div>
        </div>, renderCompactAdd(grid.rows[Math.floor(grid.size / 2)].map((cell) => cell.color)))}
        {extraCard}
      </> : <>
        {renderCompactCard(t("formatsTitle"), <>
          <div className="overview-formats">{COLOR_FORMATS.map((fmt) => { const value = formatColor(color, fmt); const display = fmt === "HEX" ? value : value.replace(/^[a-z]+\(/i, "").replace(/\)$/, "").replace(/,\s*/g, " "); return <div key={fmt} title={`${t(`fmtDesc.${fmt}`)} · ${value}`}><span>{fmt}</span><code>{display}</code>{renderCompactCopy(value, `overview-format-${fmt}`)}</div> })}</div>
          <div className="overview-format-actions">{renderCompactCopy(colorToAllFormatsText(color), "overview-formats-all", label("모두 복사", "Copy all"))}{(["JSON", "CSS"] as const).map((kind) => <button key={kind} type="button" className="overview-action" aria-label={`${kind} ${label("다운로드", "download")}`} onClick={() => downloadFile(kind === "JSON" ? colorToJson(color) : colorToCss(color), `color-${color.hex.slice(1).toLowerCase()}.${kind.toLowerCase()}`, kind === "JSON" ? "application/json" : "text/css")}><IoDownloadOutline />{kind}</button>)}</div>
          <div className="overview-channels"><div className="overview-channel-heading"><span>{t("channels")}</span><select value={format} aria-label={label("채널 색상 모델", "Channel color model")} onChange={(event) => setFormat(event.target.value as ColorFormat)}>{CHANNEL_FORMATS.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="overview-channel-bars" style={{ gridTemplateColumns: `repeat(${channels.length}, minmax(0, 1fr))` }}>{channels.map((channel) => <ColorChannelBar key={`${format}-${channel.label}`} {...channel} />)}</div></div>
        </>, undefined, "overview-formats-card")}
        {renderCompactCard(t("contrastTitle"), <>
          <div className="overview-contrast">{[{ bg: "#FFFFFF", title: t("onWhite") }, { bg: "#000000", title: t("onBlack") }].map(({ bg, title }) => { const report = contrastReport(color.hex, bg); return <div key={bg}><div className="overview-aa" style={{ background: bg, color: color.hex }}>Aa<span>{report.ratio.toFixed(2)} : 1</span></div><p>{title}</p><div className="overview-passes">{[{ ok: report.aaLarge, label: label("큰 AA", "AA L") }, { ok: report.aaNormal, label: "AA" }, { ok: report.aaaNormal, label: "AAA" }].map((item) => <span key={item.label} className={item.ok ? "pass" : "fail"}>{item.ok ? "✓" : "×"} {item.label}</span>)}</div></div> })}</div>
          <p className="overview-note">{t("bestText")} <strong>{textColor === "#FFFFFF" ? t("white") : t("black")}</strong></p>
        </>, undefined, "overview-contrast-card")}
        {renderCompactCard(t("cvdTitle"), <div className="overview-vision">{[{ hex: color.hex, name: t("cvdNormal") }, ...CVD_TYPES.map((type) => ({ hex: simulateColorBlindness(color.hex, type), name: t(`cvd.${type}`) }))].map((item, index) => <div key={index}><button type="button" className="overview-swatch" style={{ background: item.hex, height: 40 }} aria-label={`${label("색상 선택", "Select color")} ${item.name} ${item.hex}`} onClick={() => onSelectColor(item.hex)} /><p>{item.name}</p>{renderCompactCopy(item.hex, `overview-vision-${index}`, item.hex.toUpperCase())}</div>)}</div>, undefined, "overview-vision-card")}
        {renderCompactCard(label("이름 · 의미", "Name & meaning"), <>
          <div className="overview-name"><span className="overview-dot" style={{ background: color.hex }} /><strong>{color.name}</strong><span>{t(`family.${family}`)} · {t(`temp.${colorTemperature(color)}`)}</span></div>
          <h4 className="overview-meaning-title">{t(`psy.${family}.title`)}</h4><p className="overview-note">{t(`psy.${family}.desc`)}</p><p className="overview-note"><strong>{t("usage")}: </strong>{t(`psy.${family}.usage`)}</p>
        </>, undefined, "overview-meaning-card")}
        {extraCard}
      </>}
    </div>
  }

  return (
    <div className="color-lab-tools space-y-6">
      <div className="border-b border-border pb-4">
        {mode === "compose" ? (
          <Choice value={composeTool} options={composeOptions} onChange={setComposeTool} label={label("색상 조합 도구", "Composition tools")} />
        ) : (
          <Choice value={analyzeTool} options={analyzeOptions} onChange={setAnalyzeTool} label={label("색상 분석 도구", "Analysis tools")} />
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {copied === "error" ? label("복사하지 못했습니다.", "Copy failed.") : copied ? label("클립보드에 복사했습니다.", "Copied to clipboard.") : ""}
      </p>

      {mode === "compose" && composeTool === "shading" && (
        <ToolSection title={t("shadingTitle")} subtitle={label("하이라이트부터 배경까지. 색상 칩을 누르면 현재 색상으로 선택합니다.", "From highlight to background. Select any swatch to make it your current color.")}
          action={renderAddSet({ colors: shading.map((step) => step.color) })}
        >
          {renderSwatches({ colors: shading.map((step) => step.color), roles: shading.map((step) => t(`shade.${step.role}`)), token: "shading" })}
          <p className="text-xs leading-relaxed text-muted-foreground">{label("따뜻한 빛과 차가운 그림자를 바탕으로 만든 7가지 라이팅 색상입니다.", "Seven lighting colors built around warm light and cool shadows.")}</p>
        </ToolSection>
      )}

      {mode === "compose" && composeTool === "ramps" && (
        <ToolSection title={t("rampsTitle")} subtitle={label("흰색, 검정, 회색을 섞은 변화를 비교하고 필요한 색상을 선택하세요.", "Explore changes mixed toward white, black, and gray; select a color to continue.")}>
          {(["tints", "shades", "tones"] as const).map((ramp) => (
            <div key={ramp} className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold">{t(ramp)}</h4>
                {renderAddSet({ colors: ramps[ramp] })}
              </div>
              {renderSwatches({ colors: ramps[ramp], token: ramp, compact: true })}
            </div>
          ))}
        </ToolSection>
      )}

      {mode === "compose" && composeTool === "gradient" && (
        <ToolSection title={t("gradientTitle")} subtitle={label("짝 색상, 곡선, 색상 수를 조절해 그라디언트를 만드세요.", "Shape a gradient by choosing its partner, curve, and number of colors.")}
          action={renderAddSet({ colors: gradient })}
        >
          <div className="h-14 border border-border" aria-hidden style={{ background: `linear-gradient(to right, ${gradient.map((item) => item.hex).join(", ")})` }} />
          {renderSwatches({ colors: gradient, token: "gradient", compact: true })}
          <div className="grid gap-4 border-t border-border pt-4">
            <div className="space-y-2"><p className="text-xs text-muted-foreground">{t("partner")}</p>
              <Choice value={gradientPartner} onChange={setGradientPartner} label={t("partner")}
                options={(["complement", "analogous", "triad"] as GradientPartner[]).map((value) => ({ value, label: t(`gradPartner.${value}`) }))} />
            </div>
            <div className="space-y-2"><p className="text-xs text-muted-foreground">{t("easing")}</p>
              <Choice value={gradientEasing} onChange={setGradientEasing} label={t("easing")}
                options={EASING_NAMES.map((value) => ({ value, label: t(`gradEasing.${value}`) }))} />
            </div>
            <div className="space-y-2"><p className="text-xs text-muted-foreground">{t("stops")}</p>
              <Choice value={gradientStops} onChange={setGradientStops} label={t("stops")} options={[5, 7, 9, 12].map((value) => ({ value, label: value }))} />
            </div>
          </div>
        </ToolSection>
      )}

      {mode === "compose" && composeTool === "harmony" && (
        <ToolSection title={t("harmonyTitle")} subtitle={label("색상환의 관계를 바탕으로 함께 사용할 색상을 찾으세요.", "Find companion colors through relationships on the color wheel.")}
          action={renderAddSet({ colors: activeHarmony.colors })}
        >
          <Choice value={harmony} onChange={setHarmony} label={t("harmonyTitle")}
            options={harmonies.map((item) => ({ value: item.type, label: th(`${HARMONY_KEY[item.type]}Name`) }))} />
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div className="flex shrink-0 flex-col items-center gap-3 md:w-44">
              <HarmonyWheel baseHue={color.hsl.h} colors={activeHarmony.colors.map((item) => ({ hex: item.hex, angle: item.angle }))} size={160} />
              <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">{th(`${HARMONY_KEY[activeHarmony.type]}Desc`)}</p>
            </div>
            <div className="w-full min-w-0 flex-1">
              {renderSwatches({ colors: activeHarmony.colors, roles: activeHarmony.colors.map((item) => th(HARMONY_ROLE_KEY[item.name] ?? "roleBase")), token: "harmony" })}
            </div>
          </div>
        </ToolSection>
      )}

      {mode === "compose" && composeTool === "coldwarm" && (
        <ToolSection title={t("coldwarmTitle")} subtitle={label("가로는 색온도, 세로는 밝기입니다. 칩을 선택하면 그 색상을 기준으로 다시 탐색합니다.", "Temperature runs across; lightness runs down. Select a swatch to explore from that color.")}
          action={renderAddSet({ colors: grid.rows[Math.floor(grid.size / 2)].map((cell) => cell.color), text: label("가운데 행을 팔레트에 추가", "Add middle row to palette") })}
        >
          <Choice value={intensity} onChange={setIntensity} label={label("색온도 변화 강도", "Temperature shift strength")}
            options={(["subtle", "normal", "strong"] as ColdwarmIntensity[]).map((value) => ({ value, label: tc(value) }))} />
          <div className="mx-auto max-w-xl space-y-2">
            <div className="ml-7 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><span>← {tc("cold")}</span><span>{tc("warm")} →</span></div>
            <div className="flex gap-2">
              <div className="flex w-5 shrink-0 flex-col justify-between py-1 text-[10px] text-muted-foreground"><span>{tc("light")}</span><span>{tc("dark")}</span></div>
              <div className="grid min-w-0 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}>
                {grid.rows.flat().map((cell) => (
                  <button key={`${cell.tempStep}:${cell.valueStep}`} type="button" onClick={() => onSelectColor(cell.color.hex)}
                    aria-label={`${label("색상 선택", "Select color")} ${cell.color.hex} · H${cell.color.hsl.h} S${cell.color.hsl.s} L${cell.color.hsl.l}`}
                    title={`${cell.color.hex} · H${cell.color.hsl.h} S${cell.color.hsl.s} L${cell.color.hsl.l}`}
                    className={cn("aspect-square min-w-0 border border-black/10 hover:relative hover:z-10 hover:outline hover:outline-1 hover:outline-foreground focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", cell.isBase && "ring-2 ring-foreground ring-offset-1 ring-offset-background")}
                    style={{ backgroundColor: cell.color.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="ml-7 flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>{label("현재 색상", "Current color")} <span className="font-mono text-foreground">{color.hex}</span></span>
              {renderCopyButton({ value: color.hex, token: "coldwarm" })}
            </div>
          </div>
        </ToolSection>
      )}

      {mode === "analyze" && analyzeTool === "formats" && (
        <ToolSection title={t("formatsTitle")} subtitle={t("formatsSub")}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <h4 className="text-xs font-semibold text-muted-foreground">{t("channels")}</h4>
              <Choice value={format} onChange={setFormat} label={t("channels")} options={CHANNEL_FORMATS.map((value) => ({ value, label: value }))} />
              <div className="space-y-4 border-y border-border py-5">
                {channels.map((channel) => <ColorChannelBar key={`${format}-${channel.label}`} {...channel} />)}
              </div>
            </div>
            <div className="min-w-0 space-y-4">
              <div className="overflow-x-auto border border-border">
                <table className="w-full border-collapse text-left text-xs">
                  <caption className="sr-only">{t("formatsTitle")}</caption>
                  <tbody>{COLOR_FORMATS.map((fmt) => {
                    const value = formatColor(color, fmt)
                    return <tr key={fmt} className="border-b border-border last:border-0" title={t(`fmtDesc.${fmt}`)}>
                      <th scope="row" className="px-3 py-3 text-[10px] tracking-wide text-muted-foreground">{fmt}</th>
                      <td className="px-2 py-3 font-mono text-[11px] break-all">{value}</td>
                      <td className="w-9 pr-1">{renderCopyButton({ compact: true, value, token: `format-${fmt}` })}</td>
                    </tr>
                  })}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={CONTROL} onClick={() => handleCopy(colorToAllFormatsText(color), "formats-all")}>
                  {copied === "formats-all" ? <IoCheckmarkOutline className="h-3.5 w-3.5" /> : <IoCopyOutline className="h-3.5 w-3.5" />}{t("copyAll")}
                </button>
                {(["JSON", "CSS"] as const).map((kind) => (
                  <button key={kind} type="button" className={CONTROL} onClick={() => {
                    const base = `${(color.name || "color").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${color.hex.slice(1).toLowerCase()}`
                    downloadFile(kind === "JSON" ? colorToJson(color) : colorToCss(color), `${base}.${kind.toLowerCase()}`, kind === "JSON" ? "application/json" : "text/css")
                  }}><IoDownloadOutline className="h-3.5 w-3.5" />{kind}</button>
                ))}
              </div>
            </div>
          </div>
        </ToolSection>
      )}

      {mode === "analyze" && analyzeTool === "contrast" && (
        <ToolSection title={t("contrastTitle")} subtitle={label("흰색·검정 배경에서 현재 색의 텍스트 대비를 확인합니다 (WCAG).", "Check the current color’s text contrast against white and black backgrounds (WCAG).")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ background: "#FFFFFF", title: t("onWhite") }, { background: "#000000", title: t("onBlack") }].map(({ background, title }) => {
              const report = contrastReport(color.hex, background)
              return <div key={background} className="overflow-hidden border border-border">
                <div className="flex h-40 flex-col items-center justify-center gap-2" style={{ backgroundColor: background, color: color.hex }}>
                  <span className="text-5xl font-medium">Aa</span>
                  <span className="text-sm">{label("색상과 가독성", "Color and readability")}</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-baseline justify-between gap-2"><span className="text-xs text-muted-foreground">{title}</span><span className="font-mono text-xl">{report.ratio.toFixed(2)}<span className="text-xs text-muted-foreground"> : 1</span></span></div>
                  <div className="flex flex-wrap gap-2"><Badge ok={report.aaLarge} label={label("AA 큰 글자", "AA Large")} /><Badge ok={report.aaNormal} label="AA" /><Badge ok={report.aaaNormal} label="AAA" /></div>
                </div>
              </div>
            })}
          </div>
          <p className="text-sm">{t("bestText")} <span className="font-semibold">{textColor === "#FFFFFF" ? t("white") : t("black")}</span></p>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{t("contrastHint")}</p>
        </ToolSection>
      )}

      {mode === "analyze" && analyzeTool === "vision" && (
        <ToolSection title={t("cvdTitle")} subtitle={t("cvdSub")}>
          {renderSwatches({ colors: [color, ...CVD_TYPES.map((type) => ({ hex: simulateColorBlindness(color.hex, type) }))],
            roles: [t("cvdNormal"), ...CVD_TYPES.map((type) => t(`cvd.${type}`))], token: "vision" })}
          <p className="text-xs text-muted-foreground">{label("시뮬레이션 색상을 선택하거나 개별 HEX 값을 복사할 수 있습니다.", "Select a simulated color or copy its individual HEX value.")}</p>
        </ToolSection>
      )}

      {mode === "analyze" && analyzeTool === "meaning" && (
        <ToolSection title={t("psyTitle")} subtitle={t("psySub")}>
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-4 border border-border p-5">
              <span className="block h-24 w-full" style={{ backgroundColor: color.hex }} />
              <div><p className="text-[11px] text-muted-foreground">{t("closestName")}</p><p className="mt-1 text-2xl font-medium tracking-tight">{color.name}</p></div>
              <div className="flex gap-2 text-xs text-muted-foreground"><span>{t(`family.${family}`)}</span><span aria-hidden>·</span><span>{t(`temp.${colorTemperature(color)}`)}</span></div>
            </div>
            <div className="space-y-4 py-2">
              <h4 className="text-xl font-medium">{t(`psy.${family}.title`)}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`psy.${family}.desc`)}</p>
              <div className="border-t border-border pt-4"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide">{t("usage")}</p><p className="text-sm leading-relaxed text-muted-foreground">{t(`psy.${family}.usage`)}</p></div>
            </div>
          </div>
        </ToolSection>
      )}
    </div>
  )
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={cn("border px-2 py-1 text-[10px] font-medium", ok ? "border-emerald-500/30 text-emerald-400" : "border-red-400/30 text-red-400")}>
    <span aria-hidden>{ok ? "✓" : "✕"}</span> {label}
  </span>
}
