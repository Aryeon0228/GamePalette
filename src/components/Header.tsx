"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"

const STUDIO_URL = "https://studio-penumbra.com"
const siteLinks = [
  { section: "work", label: "Work", korean: "작품 · 도구" },
  { section: "research", label: "Research", korean: "논문 · 연구" },
  { section: "teaching", label: "Teaching", korean: "강의 · 멘토링" },
  { section: "education", label: "Education", korean: "학력 · 학위" },
  { section: "career", label: "Career", korean: "실무 경력" },
  { section: "awards", label: "Awards", korean: "수상 내역" },
  { section: "about", label: "About / Contact", korean: "소개 · 연락처" },
]
const labs = [
  { label: "Material Lab", href: `${STUDIO_URL}/brdf-viewer.html` },
  { label: "Interior Lab", href: `${STUDIO_URL}/interior-mapping.html` },
  { label: "Light Lab", href: `${STUDIO_URL}/lighting-lab.html` },
]

export function Header() {
  const isKorean = useLocale() === "ko"
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  const labNavigation = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    const revealCurrentLab = () => {
      if (cancelled) return
      const nav = labNavigation.current
      const current = nav?.querySelector<HTMLElement>('[aria-current="page"]')
      if (!nav || !current) return
      const bounds = nav.getBoundingClientRect()
      const link = current.getBoundingClientRect()
      const style = window.getComputedStyle(nav)
      const left = bounds.left + parseFloat(style.paddingLeft)
      const right = bounds.right - parseFloat(style.paddingRight)
      if (link.right > right) nav.scrollLeft += link.right - right
      else if (link.left < left) nav.scrollLeft -= left - link.left
    }
    revealCurrentLab()
    void document.fonts.ready.then(revealCurrentLab)
    window.addEventListener("resize", revealCurrentLab)
    return () => {
      cancelled = true
      window.removeEventListener("resize", revealCurrentLab)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("keydown", closeOnEscape)
    document.addEventListener("pointerdown", closeOnOutsideClick)
    return () => {
      document.removeEventListener("keydown", closeOnEscape)
      document.removeEventListener("pointerdown", closeOnOutsideClick)
    }
  }, [menuOpen])

  return (
    <header ref={header} className={`site-header${menuOpen ? " menu-open" : ""}`}>
      <a className="skip-link" href="#main-content">{isKorean ? "본문으로 이동" : "Skip to content"}</a>
      <nav className="site-nav nav-wrap" aria-label={isKorean ? "주 메뉴" : "Main navigation"}>
        <a className="wordmark" href={`${STUDIO_URL}/#home`} aria-label="Studio Penumbra">
          <span className="brand-orbit" aria-hidden="true">
            <svg viewBox="0 0 36 28" focusable="false">
              <defs>
                <linearGradient id="color-brand-limb" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0" stopColor="#ddd" /><stop offset=".52" stopColor="#999" stopOpacity=".3" /><stop offset="1" stopColor="#777" stopOpacity=".12" />
                </linearGradient>
                <linearGradient id="color-brand-crescent" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0" stopColor="#eee" stopOpacity=".3" /><stop offset=".3" stopColor="#fff" /><stop offset=".65" stopColor="#ddd" stopOpacity=".8" /><stop offset="1" stopColor="#999" stopOpacity=".08" />
                </linearGradient>
                <linearGradient id="color-brand-ring" gradientUnits="userSpaceOnUse" x1="1" y1="14" x2="35" y2="14">
                  <stop offset="0" stopColor="#999" /><stop offset=".38" stopColor="#bbb" /><stop offset=".53" stopColor="#999" stopOpacity=".65" /><stop offset=".63" stopColor="#777" stopOpacity="0" /><stop offset=".74" stopColor="#777" stopOpacity="0" /><stop offset=".88" stopColor="#999" stopOpacity=".8" /><stop offset="1" stopColor="#aaa" />
                </linearGradient>
              </defs>
              <ellipse cx="18" cy="14" rx="17" ry="4" fill="none" stroke="#777" />
              <circle cx="18" cy="14" r="10.5" fill="#000" stroke="url(#color-brand-limb)" />
              <path d="M18 3.5A10.5 10.5 0 0 0 18 24.5" fill="none" stroke="url(#color-brand-crescent)" strokeWidth="1.6" />
              <path d="M1 14A17 4 0 0 0 35 14" fill="none" stroke="url(#color-brand-ring)" />
            </svg>
          </span>
          <span><small>STUDIO</small>PENUMBRA</span>
        </a>
        <button
          ref={menuButton}
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={isKorean ? (menuOpen ? "메뉴 닫기" : "메뉴 열기") : (menuOpen ? "Close menu" : "Open menu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span>{isKorean ? (menuOpen ? "닫기" : "메뉴") : (menuOpen ? "Close" : "Menu")}</span>
          <span className="menu-toggle-icon" aria-hidden="true" />
        </button>
        <div className="site-links" id="site-menu">
          {siteLinks.map((item, index) => (
            <a
              key={item.section}
              href={`${STUDIO_URL}/#${item.section}`}
              data-section={item.section}
              aria-current={item.section === "work" ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{item.label}</span>
              {isKorean && <span className="nav-korean">{item.korean}</span>}
            </a>
          ))}
          <a className="nav-cv" href={`${STUDIO_URL}/CV_2026_0823.pdf`} download aria-label={isKorean ? "이력서 PDF 다운로드" : "Download CV PDF"}>
            CV <span aria-hidden="true">↓</span>
          </a>
        </div>
      </nav>
      <div className="lab-navigation-bar">
        <nav ref={labNavigation} className="lab-navigation" aria-label={isKorean ? "시뮬레이터 랩" : "Simulator labs"}>
          {labs.map((lab) => <a key={lab.href} href={lab.href}>{lab.label}</a>)}
          <Link href="/" aria-current="page" onClick={() => setMenuOpen(false)}>Color Lab</Link>
        </nav>
      </div>
    </header>
  )
}
