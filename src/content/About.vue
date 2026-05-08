<script setup lang="ts">
import { computed, ref } from "vue";
import { marked } from "marked/marked.min.js";
import { usePageSeo } from "../lib/Seo";

type NavItem = {
  id: string;
  title: string;
};

const markdownContent = ref(`# 个人简介
你好，我是小白，一名持续学习中的开发者。

我喜欢把复杂问题拆成清晰步骤，也喜欢把工具做得简单可用。

# 技术方向
- 前端：Vue / TypeScript / Vite
- 后端：Go / Node.js
- 工程化：自动化脚本、发布流程、质量检查

# 工作方式
1. 先明确目标和边界
2. 再快速验证最小可行方案
3. 最后迭代细节和体验

# 联系方式
- 邮箱：you@example.com
- GitHub：https://github.com/yourname
- 城市：中国 · 上海
`);

const profile = {
  name: "小白",
  role: "Web Developer",
  slogan: "保持好奇，持续迭代",
  location: "上海",
  email: "you@example.com",
  github: "github.com/yourname",
};

function cleanTitle(text: string) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`~[\]()]/g, "")
    .trim();
}

function toAnchorId(title: string, index: number) {
  const base = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-");
  return `section-${index + 1}-${base || "topic"}`;
}

const navItems = computed<NavItem[]>(() => {
  const result: NavItem[] = [];
  const lines = markdownContent.value.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)\s*$/);
    if (!match) continue;
    const title = cleanTitle(match[1]);
    result.push({ id: toAnchorId(title, result.length), title });
  }
  return result;
});

const markdownHtml = computed(() => {
  const rendered = marked.parse(markdownContent.value || "");
  const html = typeof rendered === "string" ? rendered : "";
  let i = 0;
  return html.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g, (_match: string, inner: string) => {
    const item = navItems.value[i];
    i += 1;
    if (!item) return `<h1>${inner}</h1>`;
    return `<h1 id="${item.id}">${inner}</h1>`;
  });
});

function goToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

usePageSeo(
  () => ({
    title: "Xiaxiaobai | About",
    description: "个人介绍页面，包含导航、个人信息卡片与 Markdown 内容。",
    keywords: ["关于", "个人介绍", "Markdown", "Xiaxiaobai"],
    canonicalPath: "/about",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "个人介绍",
      url: `${location.protocol}//${location.host}/about`,
    },
  }),
  "about-page"
);
</script>

<template>
  <div class="about-page">
    <header class="top-nav">
      <div class="brand">个人介绍</div>
      <nav class="nav-items">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-btn"
          type="button"
          @click="goToSection(item.id)"
        >
          {{ item.title }}
        </button>
      </nav>
    </header>

    <aside class="profile-float">
      <div class="avatar">{{ profile.name.slice(0, 1) }}</div>
      <h3>{{ profile.name }}</h3>
      <p class="role">{{ profile.role }}</p>
      <p class="slogan">{{ profile.slogan }}</p>
      <ul>
        <li><strong>城市：</strong>{{ profile.location }}</li>
        <li><strong>邮箱：</strong>{{ profile.email }}</li>
        <li><strong>GitHub：</strong>{{ profile.github }}</li>
      </ul>
    </aside>

    <main class="content-wrap">
      <article class="md-content" v-html="markdownHtml"></article>
    </main>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7fa 0%, #e9eef4 100%);
  color: #1f2937;
}

.top-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 24px;
  border-bottom: 1px solid #dce3ea;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
}

.brand {
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}

.nav-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nav-btn {
  border: none;
  background: #ffffff;
  color: #334155;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  color: #0f172a;
}

.profile-float {
  position: fixed;
  top: 92px;
  right: 20px;
  width: 280px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 700;
  background: #0f172a;
  color: #ffffff;
  margin-bottom: 12px;
}

.profile-float h3 {
  margin: 0;
  font-size: 20px;
}

.role {
  margin: 4px 0 0;
  color: #334155;
}

.slogan {
  margin: 8px 0 12px;
  color: #64748b;
  font-size: 14px;
}

.profile-float ul {
  margin: 0;
  padding: 0;
  list-style: none;
  line-height: 1.8;
  font-size: 14px;
}

.content-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 340px 48px 24px;
}

.md-content {
  background: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 28px;
  line-height: 1.8;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
}

.md-content :deep(h1) {
  margin-top: 0;
  margin-bottom: 12px;
  scroll-margin-top: 92px;
}

.md-content :deep(h1 + p),
.md-content :deep(ul),
.md-content :deep(ol) {
  margin-top: 8px;
}

.md-content :deep(a) {
  color: #2563eb;
}

@media (max-width: 1080px) {
  .profile-float {
    position: static;
    width: auto;
    margin: 16px 24px 0;
  }

  .content-wrap {
    padding: 20px 24px 36px;
  }
}
</style>
