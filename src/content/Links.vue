<script setup>
import { computed } from "vue"
import { usePageSeo } from "../lib/Seo"

const siteOrigin = `${location.protocol}//${location.host}`

// 直接编辑这里即可维护友情链接
const friendLinks = [
  {
    name: "manyJ'sBlog",
    url: "https://blog.jsoftstudio.top/",
    desc: "分享技术，记录生活",
    tags: ["技术", "生活"],
    avatar: "https://blog.jsoftstudio.top/css/all/favicon.ico",
    tone: "#3d6d5c",
  },
]

const applyTemplate = `联系QQ: 3495232270\n网站名称：\n网站地址：https://\n头像地址：https://\n一句简介：\n站点截图（可选）：`

const visibleLinks = computed(() =>
  friendLinks.filter((item) => String(item.url || "").trim())
)

function normalizeUrl(rawUrl) {
  const text = String(rawUrl || "").trim()
  if (!text) return "#"
  if (/^https?:\/\//i.test(text)) return text
  return `https://${text}`
}

function extractHost(rawUrl) {
  try {
    return new URL(normalizeUrl(rawUrl)).host
  } catch (err) {
    return String(rawUrl || "").trim()
  }
}

function getInitial(name) {
  const cleaned = String(name || "").replace(/\s+/g, "")
  if (!cleaned) return "?"
  return cleaned.slice(0, 1).toUpperCase()
}

usePageSeo(
  () => {
    const list = visibleLinks.value
    return {
      title: "Xiaxiaobai | Links",
      description: "友情链接页面，收录长期更新、内容友好的站点。",
      keywords: ["友情链接", "Links", "Xiaxiaobai", "站点推荐"],
      canonicalPath: "/links",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Xiaxiaobai Links",
        url: `${siteOrigin}/links`,
        description: "友情链接页面",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: list.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "WebSite",
              name: item.name,
              url: normalizeUrl(item.url),
              description: item.desc,
            },
          })),
        },
      },
    }
  },
  "links-page"
)
</script>

<template>
  <div class="links-page">
    <header class="panel hero">
      <div class="hero-main">
        <p class="eyebrow">Friend Links</p>
        <h1 class="title">友情链接</h1>
        <p class="subtitle">友链不仅仅只是增加站点质量的工具，而是传递人与人之间交流的心绳</p>
        <div class="meta-row">
          <span class="meta-item">友链数量：{{ visibleLinks.length }}</span>
          <span class="meta-item">页面入口：/links</span>
        </div>
      </div>
      <div class="hero-actions">
        <a class="btn btn-main" href="/">Home</a>
      </div>
    </header>

    <main class="content-stack">
      
      <section class="links-grid" aria-label="友情链接列表">
        <article
          v-for="(item, index) in visibleLinks"
          :key="item.url + item.name"
          class="link-card"
          :style="{ '--i': index, '--tone': item.tone || '#3d6d5c' }"
        >
          <a class="card-link" :href="normalizeUrl(item.url)" target="_blank" rel="noopener noreferrer">
            <div class="avatar">
              <img v-if="item.avatar" :src="item.avatar" :alt="`${item.name} avatar`" loading="lazy" referrerpolicy="no-referrer" />
              <span v-else>{{ getInitial(item.name) }}</span>
            </div>
            <div class="card-main">
              <h3>{{ item.name }}</h3>
              <p class="host">{{ extractHost(item.url) }}</p>
              <p class="desc">{{ item.desc }}</p>
              <div class="tags">
                <span v-for="tag in item.tags" :key="`${item.name}-${tag}`">{{ tag }}</span>
              </div>
            </div>
            <span class="visit">访问</span>
          </a>
        </article>
      </section>

      <section id="apply-format" class="panel apply">
        <div class="section-head">
          <h2>交换说明</h2>
          <span>长期更新 / 内容友好 / 可正常访问</span>
        </div>
        <pre>{{ applyTemplate }}</pre>
      </section>
    </main>
  </div>
</template>

<style scoped>
.links-page {
  --bg: #edf1f5;
  --bg-soft: #dce3eb;
  --ink: #2f3642;
  --line: rgba(66, 79, 96, 0.16);
  --panel: rgba(250, 252, 255, 0.84);
  --main: #60758f;
  --main-soft: rgba(96, 117, 143, 0.12);
  --section-gap: 24px;
  min-height: 100dvh;
  padding: clamp(18px, 4.2vw, 44px);
  background:
    radial-gradient(1100px 560px at 4% -10%, rgba(135, 162, 190, 0.22) 0%, rgba(135, 162, 190, 0) 56%),
    radial-gradient(900px 460px at 102% 0%, rgba(182, 199, 218, 0.28) 0%, rgba(182, 199, 218, 0) 58%),
    linear-gradient(180deg, var(--bg) 0%, #e7edf3 50%, var(--bg-soft) 100%);
  color: var(--ink);
  font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.links-page::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
}

.panel {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel);
  backdrop-filter: blur(8px);
  box-shadow: 0 14px 26px -16px rgba(63, 76, 94, 0.28);
  animation: panel-in 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: center;
  padding: clamp(20px, 3.2vw, 34px);
}

.content-stack {
  margin-top: var(--section-gap);
}

.content-stack > * {
  margin: 0;
}

.content-stack > * + * {
  margin-top: var(--section-gap);
}

.hero-main {
  max-width: 760px;
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.14em;
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(63, 76, 94, 0.76);
}

.title {
  margin: 10px 0 6px;
  font-size: clamp(32px, 5.8vw, 56px);
  line-height: 1.06;
  letter-spacing: 0.02em;
  font-family: "Palatino Linotype", "Iowan Old Style", "Noto Serif SC", serif;
}

.subtitle {
  margin: 0;
  max-width: 640px;
  color: rgba(47, 54, 66, 0.72);
  font-size: clamp(14px, 1.75vw, 18px);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.meta-item {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(96, 117, 143, 0.32);
  background: rgba(96, 117, 143, 0.1);
  color: #536479;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  appearance: none;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  border: 1px solid transparent;
  transition: transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, border-color 0.22s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn-main {
  color: #f6f8fb;
  background: #667c97;
  border-color: #667c97;
  box-shadow: 0 10px 20px rgba(102, 124, 151, 0.24);
}

.apply {
  padding: clamp(16px, 2.8vw, 26px);
  animation-delay: 0.12s;
  box-shadow: 0 16px 28px -18px rgba(63, 76, 94, 0.26);
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.section-head h2 {
  margin: 0;
  font-size: clamp(22px, 3.2vw, 30px);
}

.section-head span {
  color: rgba(47, 54, 66, 0.66);
  font-size: 13px;
  letter-spacing: 0.05em;
}

.apply pre {
  margin: 14px 0 0;
  overflow-x: auto;
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(66, 79, 96, 0.18);
  background: linear-gradient(180deg, rgba(243, 247, 252, 0.96) 0%, rgba(235, 241, 248, 0.96) 100%);
  color: #425266;
  font-size: 13px;
  line-height: 1.68;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.link-card {
  animation: card-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(180ms + (var(--i) * 70ms));
}

.card-link {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.7);
  padding: 14px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.card-link:hover {
  transform: translateY(-3px);
  border-color: var(--tone);
  box-shadow: 0 12px 22px rgba(71, 85, 104, 0.2);
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  border: 1px solid rgba(66, 79, 96, 0.16);
  background: linear-gradient(145deg, var(--tone), #c7d1dc);
  display: grid;
  place-items: center;
  color: #fff;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 20px;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-main h3 {
  margin: 0;
  font-size: 20px;
  line-height: 1.15;
}

.host {
  margin: 4px 0 0;
  color: rgba(47, 54, 66, 0.58);
  font-size: 12px;
  letter-spacing: 0.03em;
}

.desc {
  margin: 8px 0 10px;
  color: rgba(47, 54, 66, 0.78);
  font-size: 14px;
  line-height: 1.55;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tags span {
  font-size: 11px;
  border-radius: 999px;
  padding: 4px 8px;
  border: 1px solid rgba(66, 79, 96, 0.16);
  background: rgba(121, 139, 162, 0.12);
  color: rgba(66, 79, 96, 0.9);
}

.visit {
  align-self: center;
  justify-self: end;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #5f748e;
  border: 1px solid rgba(96, 117, 143, 0.34);
  padding: 6px 8px;
  border-radius: 999px;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .links-page {
    padding: 14px;
  }

  .card-link {
    grid-template-columns: auto 1fr;
    gap: 10px;
  }

  .visit {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
