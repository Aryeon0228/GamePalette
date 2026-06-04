import { getTranslations } from "next-intl/server"

export async function Footer() {
  const t = await getTranslations("footer")

  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="container text-center text-sm text-muted-foreground space-y-2">
        <p>{t("tagline")}</p>
        <p>
          {t("contact")}:{" "}
          <a href="mailto:cloudysnowyday@gmail.com" className="hover:text-foreground transition-colors">
            cloudysnowyday@gmail.com
          </a>
          {" | "}
          Discord: <span className="hover:text-foreground">@cloudysnowyday</span>
        </p>
        <p className="mt-1">
          Twitter:{" "}
          <a
            href="https://twitter.com/TomatoO_O"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            @TomatoO_O
          </a>
        </p>
      </div>
    </footer>
  )
}
