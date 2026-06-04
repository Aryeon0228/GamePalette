"use server"

import { cookies } from "next/headers"
import { defaultLocale, locales, type Locale } from "./config"

const COOKIE_NAME = "NEXT_LOCALE"

export async function getUserLocale(): Promise<Locale> {
  const value = (await cookies()).get(COOKIE_NAME)?.value
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale
}

export async function setUserLocale(locale: Locale) {
  ;(await cookies()).set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
