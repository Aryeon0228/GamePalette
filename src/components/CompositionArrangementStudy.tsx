"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { useLocale } from "next-intl"
import { initialStudy, useCompositionState, type ArrangementObject, type Lesson, type ObjectId } from "@/stores/compositionSessionStore"
import "./CompositionArrangementStudy.css"

type Drag = { pointerId: number; id: ObjectId; offsetX: number; offsetY: number; svg: SVGSVGElement }

const WIDTH = 700
const HEIGHT = 430
const LESSONS: Lesson[] = ["scale", "space", "direction"]
const OBJECTS: ObjectId[] = ["box", "cup", "pencil", "disc"]
const BOUNDS: Record<ObjectId, [number, number]> = { box: [56, 49], cup: [76, 53], pencil: [91, 13], disc: [50, 50] }

function objectExtent(object: ArrangementObject) {
  const [halfWidth, halfHeight] = BOUNDS[object.id]
  const angle = object.angle * Math.PI / 180
  const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle))
  return { x: (halfWidth * cos + halfHeight * sin) * object.scale + 12, y: (halfWidth * sin + halfHeight * cos) * object.scale + 12 }
}

function keepInFrame(object: ArrangementObject): ArrangementObject {
  const extent = objectExtent(object)
  return { ...object, x: Math.max(extent.x, Math.min(WIDTH - extent.x, object.x)), y: Math.max(extent.y, Math.min(HEIGHT - extent.y, object.y)) }
}

function ObjectShape({ id, silhouette }: { id: ObjectId; silhouette: boolean }) {
  const color = silhouette ? "#242128" : { box: "#8e8499", cup: "#aaa0bb", pencil: "#615768", disc: "#827987" }[id]
  if (id === "box") return <g fill={color}>
    <rect x="-56" y="-49" width="112" height="98" rx="3" />
    {!silhouette && <g stroke="#e6dfec" opacity="0.25" strokeWidth="2"><path d="M-56-23H56M0-49V-23" /><path d="M-15 31H15" /></g>}
  </g>
  if (id === "cup") return <g fill={color}>
    <path d="M40-28H53C79-28 79 24 53 24H40" fill="none" stroke={color} strokeWidth="12" />
    <path d="M-44-43H44L39 37Q38 49 26 49H-26Q-38 49-39 37Z" />
    <ellipse cy="-43" rx="44" ry="10" />
    {!silhouette && <ellipse cy="-43" rx="35" ry="5" fill="#675d74" />}
  </g>
  if (id === "pencil") return <g fill={color}>
    <path d="M-91-11H62L91 0 62 11H-91Z" />
    {!silhouette && <><path d="M62-11L91 0 62 11Z" fill="#c4bdcb" /><path d="M80-4L91 0 80 4Z" fill="#514757" /><path d="M-81-11V11" stroke="#c4bdcb" strokeWidth="4" /></>}
  </g>
  return <circle r="50" fill={color} />
}

/** A small, independent arrangement exercise; no image or palette state is shared. */
export function CompositionArrangementStudy() {
  const ko = useLocale() === "ko"
  const t = (kr: string, en: string) => ko ? kr : en
  const uid = useId()
  const [lesson, setLesson] = useCompositionState("lesson")
  const [studies, setStudies] = useCompositionState("studies")
  const [selectedId, setSelectedId] = useCompositionState("selectedId")
  const [silhouette, setSilhouette] = useCompositionState("silhouette")
  const [draggingId, setDraggingId] = useState<ObjectId | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tabRefs = useRef<Partial<Record<Lesson, HTMLButtonElement | null>>>({})
  const { objects, preset, savedObjects } = studies[lesson]
  const selected = objects.find(object => object.id === selectedId)!
  const names: Record<ObjectId, string> = { box: t("상자", "Box"), cup: t("컵", "Cup"), pencil: t("연필", "Pencil"), disc: t("원형", "Disc") }
  const titles: Record<Lesson, string> = { scale: t("크기 차이", "Size contrast"), space: t("간격과 여백", "Spacing & space"), direction: t("방향과 겹침", "Direction & overlap") }
  const intros: Record<Lesson, string> = {
    scale: t("하나의 크기를 바꾸며, 먼저 보이는 물건이 달라지는지 살펴보세요.", "Resize one object and notice whether the first thing you see changes."),
    space: t("가까이 묶을 물건과 떨어뜨릴 물건을 정하고, 남은 여백을 보세요.", "Choose which objects to group or separate, then look at the space left between them."),
    direction: t("물건을 기울이고 겹쳐서, 시선의 흐름과 앞뒤 관계를 바꿔보세요.", "Rotate and overlap objects to explore visual flow and which shape appears in front."),
  }
  const questions: Record<Lesson, string> = {
    scale: t("가장 큰 물건과 가장 먼저 보이는 물건이 같나요? 작은 물건을 더 키우면 무엇이 달라지나요?", "Is the largest object also the first you notice? What changes when you enlarge a smaller one?"),
    space: t("어떤 물건이 한 묶음으로 보이나요? 물건 사이와 화면 가장자리에 남은 빈 모양도 비교해보세요.", "Which objects read as a group? Compare the empty shapes between objects and around the frame."),
    direction: t("연필 끝은 어디를 향하나요? 앞뒤를 바꾼 뒤에도 컵과 상자의 형태가 잘 보이나요?", "Where does the pencil point? After changing the order, can you still recognize the cup and box?"),
  }
  const presetNames: Record<Lesson, [string, string]> = {
    scale: [t("비슷한 덩어리", "Similar masses"), t("크기 대비", "Size contrast")],
    space: [t("고르게 펼치기", "Spread evenly"), t("묶고 띄우기", "Group & separate")],
    direction: [t("나란히 놓기", "Side by side"), t("기울여 겹치기", "Tilt & overlap")],
  }

  useEffect(() => () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.svg.hasPointerCapture(drag.pointerId)) drag.svg.releasePointerCapture(drag.pointerId)
  }, [])

  function endDrag(pointerId?: number) {
    const drag = dragRef.current
    if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return
    dragRef.current = null
    setDraggingId(null)
    if (drag.svg.hasPointerCapture(drag.pointerId)) drag.svg.releasePointerCapture(drag.pointerId)
  }

  function changeLesson(next: Lesson) {
    endDrag()
    setLesson(next)
  }

  function editObject(id: ObjectId, change: Partial<ArrangementObject> | ((object: ArrangementObject) => ArrangementObject)) {
    setStudies(current => ({ ...current, [lesson]: { ...current[lesson], preset: null, objects: current[lesson].objects.map(object => object.id === id ? keepInFrame(typeof change === "function" ? change(object) : { ...object, ...change }) : object) } }))
  }

  function applyPreset(next: 0 | 1) {
    endDrag()
    setStudies(current => {
      const previous = current[lesson]
      return { ...current, [lesson]: { ...initialStudy(lesson, next), savedObjects: previous.savedObjects ?? (previous.preset === null ? previous.objects : undefined) } }
    })
  }

  function restoreArrangement() {
    endDrag()
    setStudies(current => {
      const saved = current[lesson].savedObjects
      return saved ? { ...current, [lesson]: { objects: saved, preset: null } } : current
    })
  }

  function pointInFrame(clientX: number, clientY: number) {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return null
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
  }

  function startDrag(event: PointerEvent<SVGGElement>, object: ArrangementObject) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return
    const svg = svgRef.current
    const point = pointInFrame(event.clientX, event.clientY)
    if (!svg || !point) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    setSelectedId(object.id)
    svg.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, id: object.id, offsetX: point.x - object.x, offsetY: point.y - object.y, svg }
    setDraggingId(object.id)
  }

  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = pointInFrame(event.clientX, event.clientY)
    if (point) editObject(drag.id, { x: point.x - drag.offsetX, y: point.y - drag.offsetY })
  }

  function moveWithKeyboard(event: KeyboardEvent<Element>, id: ObjectId) {
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(id); return }
    if (event.key === "Escape") { endDrag(); return }
    if (!delta[event.key]) return
    event.preventDefault()
    setSelectedId(id)
    const [x, y] = delta[event.key]
    const step = event.shiftKey ? 16 : 4
    editObject(id, object => ({ ...object, x: object.x + x * step, y: object.y + y * step }))
  }

  function changeOrder(front: boolean) {
    setStudies(current => {
      const items = current[lesson].objects
      const item = items.find(object => object.id === selectedId)!
      const rest = items.filter(object => object.id !== selectedId)
      return { ...current, [lesson]: { ...current[lesson], preset: null, objects: front ? [...rest, item] : [item, ...rest] } }
    })
  }

  const range = (label: string, value: number, min: number, max: number, change: (value: number) => void, unit = "%") => <label className="cas-range">
    <span>{label}<output>{value}{unit}</output></span>
    <input type="range" min={min} max={max} value={value} aria-label={`${names[selectedId]} · ${label}`} onChange={event => change(Number(event.target.value))} />
  </label>

  return <section className="composition-arrangement-study" aria-label={t("물건 배치 실습", "Object arrangement exercise")}>
    <div className="cas-tabs" role="tablist" aria-label={t("배치 관찰 주제", "Arrangement lessons")}>
      {LESSONS.map((item, index) => <button key={item} ref={node => { tabRefs.current[item] = node }} type="button" role="tab" id={`${uid}-tab-${item}`} aria-controls={`${uid}-panel`} aria-selected={lesson === item} tabIndex={lesson === item ? 0 : -1} onClick={() => changeLesson(item)} onKeyDown={event => {
        let next: Lesson | undefined
        if (event.key === "ArrowRight") next = LESSONS[(index + 1) % LESSONS.length]
        if (event.key === "ArrowLeft") next = LESSONS[(index + LESSONS.length - 1) % LESSONS.length]
        if (event.key === "Home") next = LESSONS[0]
        if (event.key === "End") next = LESSONS[LESSONS.length - 1]
        if (next) { event.preventDefault(); changeLesson(next); tabRefs.current[next]?.focus() }
      }}><span>0{index + 1}</span>{titles[item]}</button>)}
    </div>

    <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${lesson}`} className="cas-panel">
      <p className="cas-intro">{intros[lesson]}</p>
      <div className="cas-layout">
        <div className="cas-visual">
          <div className="cas-stage-toolbar">
            <span>{preset === null ? t("직접 바꾼 배치", "Your arrangement") : presetNames[lesson][preset]}</span>
            <button type="button" aria-pressed={silhouette} onClick={() => setSilhouette(value => !value)}>{t("실루엣으로 보기", "Silhouette view")}</button>
          </div>
          <div className="cas-stage">
            <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={t("물건 네 개를 옮길 수 있는 구도 프레임", "Composition frame with four movable objects")} aria-describedby={`${uid}-help`} onPointerMove={moveDrag} onPointerUp={event => endDrag(event.pointerId)} onPointerCancel={event => endDrag(event.pointerId)} onLostPointerCapture={event => endDrag(event.pointerId)}>
              <path className="cas-frame-marks" d="M16 34V16H34M666 16H684V34M684 396V414H666M34 414H16V396" />
              {objects.map(object => {
                const [halfWidth, halfHeight] = BOUNDS[object.id]
                return <g key={object.id} className={`cas-object${selectedId === object.id ? " is-selected" : ""}${draggingId === object.id ? " is-dragging" : ""}`} transform={`translate(${object.x} ${object.y}) rotate(${object.angle}) scale(${object.scale})`} role="button" tabIndex={0} aria-pressed={selectedId === object.id} aria-label={`${names[object.id]} · ${t("가로", "x")} ${Math.round(object.x / WIDTH * 100)}%, ${t("세로", "y")} ${Math.round(object.y / HEIGHT * 100)}%`} onFocus={() => setSelectedId(object.id)} onPointerDown={event => startDrag(event, object)} onKeyDown={event => moveWithKeyboard(event, object.id)}>
                  <rect className="cas-hit-area" x={-halfWidth - 8} y={-Math.max(halfHeight + 8, 35)} width={(halfWidth + 8) * 2} height={Math.max(halfHeight + 8, 35) * 2} />
                  <ObjectShape id={object.id} silhouette={silhouette} />
                  <rect className="cas-selection" x={-halfWidth - 7} y={-halfHeight - 7} width={(halfWidth + 7) * 2} height={(halfHeight + 7) * 2} rx="2" vectorEffect="non-scaling-stroke" />
                </g>
              })}
            </svg>
          </div>
          <p id={`${uid}-help`} className="cas-help">{t("물건을 드래그하거나, 선택 후 방향키로 이동 · Shift로 크게 이동", "Drag objects, or select and use arrow keys · Hold Shift for larger steps")}</p>
          <div className="cas-question"><span>Q.</span><p>{questions[lesson]}</p></div>
        </div>

        <div className="cas-controls">
          <fieldset className="cas-comparison"><legend>{t("예시 배치 불러오기", "Try example arrangements")}</legend>
            <div className="cas-presets">{([0, 1] as const).map(value => <button key={value} type="button" aria-pressed={preset === value} onClick={() => applyPreset(value)}><span>{value === 0 ? "A" : "B"}</span>{presetNames[lesson][value]}</button>)}</div>
            <p>{t("예시를 오가며 비교하세요. 직접 바꾼 배치는 아래 버튼으로 돌아갈 수 있어요.", "Compare the examples. Return to your own arrangement with the button below.")}</p>
            <button className="cas-restore" type="button" disabled={!savedObjects} onClick={restoreArrangement}>{t("내 배치로 돌아가기", "Return to my arrangement")}</button>
          </fieldset>
          <fieldset className="cas-object-controls"><legend>{t("물건 선택", "Select an object")}</legend>
            <div className="cas-object-picker" role="group" aria-label={t("조절할 물건", "Object to adjust")}>
              {OBJECTS.map(id => <button key={id} type="button" aria-pressed={selectedId === id} onClick={() => setSelectedId(id)} onKeyDown={event => moveWithKeyboard(event, id)}>{names[id]}</button>)}
            </div>
            <div className="cas-selected-title"><span>{names[selectedId]}</span><span>{t("선택됨", "Selected")}</span></div>
            {lesson === "scale" && <>
              {range(t("크기", "Scale"), Math.round(selected.scale * 100), 45, 185, value => editObject(selectedId, { scale: value / 100 }))}
              <p>{t("실루엣으로 바꿔 면적의 차이도 비교해보세요. 서로 다른 모양은 같은 배율에서도 다르게 보여요.", "Try the silhouette view to compare areas. Different shapes can feel different at the same scale.")}</p>
            </>}
            {lesson === "space" && <>
              {range(t("가로 위치", "Horizontal position"), Math.round(selected.x / WIDTH * 100), 0, 100, value => editObject(selectedId, { x: value / 100 * WIDTH }))}
              {range(t("세로 위치", "Vertical position"), Math.round(selected.y / HEIGHT * 100), 0, 100, value => editObject(selectedId, { y: value / 100 * HEIGHT }))}
              <p>{t("가까운 것끼리 모은 뒤 하나만 떨어뜨려보세요. 가장자리의 여백도 함께 달라져요.", "Group some objects, then move one away. Notice how the margins change too.")}</p>
            </>}
            {lesson === "direction" && <>
              {range(t("기울기", "Rotation"), selected.angle, -90, 90, value => editObject(selectedId, { angle: value }), "°")}
              <div className="cas-order"><button type="button" disabled={objects[objects.length - 1].id === selectedId} onClick={() => changeOrder(true)}>{t("맨 앞으로", "To front")}</button><button type="button" disabled={objects[0].id === selectedId} onClick={() => changeOrder(false)}>{t("맨 뒤로", "To back")}</button></div>
              <p>{t("드래그로 겹친 뒤 앞뒤를 바꿔보세요. 원형처럼 돌려도 외곽이 같은 모양도 있어요.", "Overlap objects, then change their order. A disc keeps the same outline when rotated.")}</p>
            </>}
          </fieldset>
          <button className="cas-reset" type="button" onClick={() => { endDrag(); setStudies(current => ({ ...current, [lesson]: initialStudy(lesson) })) }}>{t("이 주제 초기화", "Reset this lesson")}</button>
        </div>
      </div>
    </div>
  </section>
}
