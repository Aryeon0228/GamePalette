"use client"

import { useLocale } from "next-intl"
import { useCompositionState } from "@/stores/compositionSessionStore"
import { CompositionArrangementStudy } from "@/components/CompositionArrangementStudy"
import { ImageCompositionStudy } from "@/components/ImageCompositionStudy"
import "./CompositionLabWorkspace.css"

export function CompositionLabWorkspace() {
  const ko = useLocale() === "ko"
  const t = (kr: string, en: string) => ko ? kr : en
  const [imageUrl, setImageUrl] = useCompositionState("imageUrl")

  return (
    <div className="composition-lab" data-lab="composition">
      <header className="composition-heading">
        <div>
          <p className="composition-eyebrow"><a href="https://studio-penumbra.com/#lab">LAB</a><span>/</span>{t("화면 구성과 사용성", "COMPOSITION & USABILITY")}</p>
          <h1>Composition <b>Lab</b></h1>
        </div>
        <p>{t("같은 물건, 다른 배치.", "Same objects, different arrangements.")}<br /> {t("무엇이 먼저 보이는지 비교해보세요.", "Compare what catches your eye first.")}</p>
      </header>

      <nav className="composition-jumps" aria-label={t("구도 실험 바로가기", "Jump to composition experiments")}>
        <a href="#composition-arrange"><span>01</span>{t("물건 배치", "Object arrangement")}</a>
        <a href="#composition-image"><span>02</span>{t("이미지 · 명암 덩어리", "Image & value masses")}</a>
      </nav>

      <section id="composition-arrange" tabIndex={-1} className="composition-section" aria-labelledby="arrangement-heading">
        <div className="composition-section-heading">
          <h2 id="arrangement-heading"><span>01</span>{t("물건 배치", "Object arrangement")}</h2>
          <p>{t("크기, 간격, 방향을 하나씩 바꾸며 인상을 비교하세요.", "Change size, spacing and direction to compare the impression.")}</p>
        </div>
        <CompositionArrangementStudy />
      </section>

      <section id="composition-image" tabIndex={-1} className="composition-section" aria-labelledby="image-composition-heading">
        <div className="composition-section-heading">
          <h2 id="image-composition-heading"><span>02</span>{t("이미지 · 명암 덩어리", "Image & value masses")}</h2>
          <p>{t("내 이미지의 덩어리와 여백을 나누고, 구도 선을 겹쳐보세요.", "Inspect masses and negative space, then layer guides over your image.")}</p>
        </div>
        <ImageCompositionStudy imageUrl={imageUrl} onImageLoad={setImageUrl} />
      </section>

      <aside className="composition-reference" aria-label={t("참고 자료", "Reference")}>
        <span>{t("참고", "Reference")}</span>
        <p><a href="https://www.youtube.com/watch?v=D1DlLqZfazQ" target="_blank" rel="noopener noreferrer">{t("모두의미술 · 구도의 모든 것 ↗", "Modu Misul · Composition series ↗")}</a><br />{t("강의의 크기·여백·방향·겹침 개념을 바탕으로 새로 구성한 배치 실습입니다.", "Original arrangement exercises inspired by the series’ ideas on size, space, direction and overlap.")}</p>
      </aside>
    </div>
  )
}
