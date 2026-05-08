import { onBeforeUnmount, watchEffect } from "vue";

type JsonLd = Record<string, unknown> | null;

type SeoConfig = {
  title: string;
  description: string;
  keywords?: string[] | string;
  canonicalPath?: string;
  ogType?: string;
  robots?: string;
  jsonLd?: JsonLd;
};

type SeoConfigFactory = () => SeoConfig;

function toAbsoluteUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const fixedPath = path.startsWith("/") ? path : `/${path}`;
  return `${location.protocol}//${location.host}${fixedPath}`;
}

function upsertMeta(scope: string, id: string, key: "name" | "property", value: string, content: string) {
  let meta = document.head.querySelector(
    `meta[data-seo-scope="${scope}"][data-seo-id="${id}"]`
  ) as HTMLMetaElement | null;
  if (!content) {
    if (meta) meta.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("data-seo-scope", scope);
    meta.setAttribute("data-seo-id", id);
    document.head.appendChild(meta);
  }
  meta.setAttribute(key, value);
  meta.setAttribute("content", content);
}

function upsertCanonical(scope: string, href: string) {
  let link = document.head.querySelector(
    `link[data-seo-scope="${scope}"][data-seo-id="canonical"]`
  ) as HTMLLinkElement | null;
  if (!href) {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("data-seo-scope", scope);
    link.setAttribute("data-seo-id", "canonical");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function upsertJsonLd(scope: string, payload: JsonLd) {
  let script = document.head.querySelector(
    `script[data-seo-scope="${scope}"][data-seo-id="jsonld"]`
  ) as HTMLScriptElement | null;
  if (!payload) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("data-seo-scope", scope);
    script.setAttribute("data-seo-id", "jsonld");
    script.setAttribute("type", "application/ld+json");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

function clearScopedSeo(scope: string) {
  document.head.querySelectorAll(`[data-seo-scope="${scope}"]`).forEach((node) => node.remove());
}

export function usePageSeo(configFactory: SeoConfigFactory, scope: string) {
  watchEffect(() => {
    const config = configFactory();
    const canonical = toAbsoluteUrl(config.canonicalPath || "");
    const keywords = Array.isArray(config.keywords)
      ? config.keywords.join(", ")
      : String(config.keywords || "");
    const ogType = config.ogType || "website";
    const robots = config.robots || "index,follow,max-image-preview:large";

    document.title = config.title;
    upsertCanonical(scope, canonical);
    upsertMeta(scope, "description", "name", "description", config.description);
    upsertMeta(scope, "keywords", "name", "keywords", keywords);
    upsertMeta(scope, "robots", "name", "robots", robots);
    upsertMeta(scope, "og:title", "property", "og:title", config.title);
    upsertMeta(scope, "og:description", "property", "og:description", config.description);
    upsertMeta(scope, "og:type", "property", "og:type", ogType);
    upsertMeta(scope, "og:url", "property", "og:url", canonical);
    upsertMeta(scope, "og:site_name", "property", "og:site_name", "Xiaxiaobai");
    upsertMeta(scope, "twitter:card", "name", "twitter:card", "summary_large_image");
    upsertMeta(scope, "twitter:title", "name", "twitter:title", config.title);
    upsertMeta(scope, "twitter:description", "name", "twitter:description", config.description);
    upsertJsonLd(scope, config.jsonLd || null);
  });

  onBeforeUnmount(() => {
    clearScopedSeo(scope);
  });
}
