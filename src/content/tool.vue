<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { marked } from 'marked/marked.min.js'
import '../lib/All.css'
import { Ipget } from '../lib/Http'
import { usePageSeo } from '../lib/Seo'

type SoftwareItem = {
  id: string
  name: string
  version: string
  desc: string
  tags: string[]
}

type GetToolResponse = {
  error: boolean | string | number
  message?: string
  body?: string
}

const HISTORY_FLAG = 'history'
const IP = Ipget()
const siteOrigin = `${location.protocol}//${location.host}`

function normalizeText(input: string) {
  return (input || '').trim()
}

const builtInSoftwares: SoftwareItem[] = [
  {
    id: 'rget',
    name: 'Rget',
    version: 'v1.0.0',
    desc: 'Rust 高性能命令行下载器，多线程分片、断点续传、自动重试与批量下载。',
    tags: ['跨平台', '下载器'],
  },
  {
    id: 'avalon',
    name: 'Avalon',
    version: 'v1.0.0',
    desc: 'Rust 编写的透明转发工具，面向稳定、轻量与可维护的网络转发场景。',
    tags: ['透明转发'],
  },
  {
    id: 'pixi',
    name: 'Pixi',
    version: 'v0.5.0',
    desc: '一个面向 Pixiv 资源整理与抓取流程的自动化工具。',
    tags: ['爬虫'],
  },
]

const softwares = ref<SoftwareItem[]>([...builtInSoftwares])
const query = ref('')
const activeTag = ref('全部')
const selectedId = ref('')

const readmeLoading = ref(false)
const historyLoading = ref(false)
const readmeError = ref('')
const historyError = ref('')
const readmeMd = ref('')
const historyMd = ref('')
const readmeHtml = ref('')
const historyHtml = ref('')
let loadToken = 0

const tagList = computed(() => {
  const tags = new Set<string>()
  softwares.value.forEach((item) => item.tags.forEach((tag) => tags.add(tag)))
  return ['全部', ...Array.from(tags).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))]
})

const filteredSoftwares = computed(() => {
  const keyword = normalizeText(query.value).toLowerCase()
  return softwares.value.filter((item) => {
    if (activeTag.value !== '全部' && !item.tags.includes(activeTag.value)) return false
    if (!keyword) return true
    const haystack = `${item.name}\n${item.version}\n${item.desc}\n${item.tags.join(' ')}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

const selectedSoftware = computed(
  () => filteredSoftwares.value.find((item) => item.id === selectedId.value) ?? null
)

function escapeHtml(text: string) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function renderMarkdown(md: string) {
  try {
    const out = marked.parse(md || '')
    return typeof out === 'string' ? out : await out
  } catch (err: unknown) {
    console.error('marked.parse failed:', err)
    return `<pre>${escapeHtml(md || '')}</pre>`
  }
}

function clearDocs() {
  readmeLoading.value = false
  historyLoading.value = false
  readmeError.value = ''
  historyError.value = ''
  readmeMd.value = ''
  historyMd.value = ''
  readmeHtml.value = ''
  historyHtml.value = ''
}

function parseErrorFlag(value: unknown) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false' || value == null) return false
  return Boolean(value)
}

async function fetchToolMd(name: string, version?: string) {
  const url = new URL(`${IP}/api/get_tool`)
  url.searchParams.set('name', name)
  if (version) url.searchParams.set('version', version)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`请求失败 (${res.status})`)

  const data = (await res.json()) as GetToolResponse & Record<string, unknown>
  if (!data || typeof data !== 'object') throw new Error('返回数据异常')
  if (parseErrorFlag(data.error)) throw new Error(String(data.message || '接口返回错误'))
  const body = data.body ?? data.Body ?? ''
  return typeof body === 'string' ? body : JSON.stringify(body)
}

async function loadToolDocs(id: string) {
  const name = String(id || '').trim()
  if (!name) {
    clearDocs()
    return
  }

  const token = ++loadToken
  readmeLoading.value = true
  historyLoading.value = true
  readmeError.value = ''
  historyError.value = ''
  readmeMd.value = ''
  historyMd.value = ''
  readmeHtml.value = ''
  historyHtml.value = ''

  const [readmeRes, historyRes] = await Promise.allSettled([
    fetchToolMd(name),
    fetchToolMd(name, HISTORY_FLAG),
  ])
  if (token !== loadToken) return

  if (readmeRes.status === 'fulfilled') readmeMd.value = readmeRes.value
  else readmeError.value = readmeRes.reason instanceof Error ? readmeRes.reason.message : 'README 加载失败'

  if (historyRes.status === 'fulfilled') historyMd.value = historyRes.value
  else historyError.value = historyRes.reason instanceof Error ? historyRes.reason.message : '更新记录加载失败'

  const [nextReadmeHtml, nextHistoryHtml] = await Promise.all([
    readmeMd.value ? renderMarkdown(readmeMd.value) : Promise.resolve(''),
    historyMd.value ? renderMarkdown(historyMd.value) : Promise.resolve(''),
  ])
  if (token !== loadToken) return

  readmeHtml.value = nextReadmeHtml
  historyHtml.value = nextHistoryHtml
  readmeLoading.value = false
  historyLoading.value = false
}

function selectSoftware(id: string) {
  selectedId.value = id
}

usePageSeo(
  () => {
  const visible = filteredSoftwares.value
  const selected = selectedSoftware.value
  const names = visible.map((item) => item.name).slice(0, 10)
  const title = selected ? `Xiaxiaobai | Tool Docs | ${selected.name}` : 'Xiaxiaobai | Tool Docs'
  const description = selected
    ? `三段式文档页：左侧书签列表，中间 README，右侧更新记录。当前软件：${selected.name}。`
    : '三段式软件文档页：左侧书签列表、中间 README、右侧更新记录。'
  const keywords = [
    '软件文档',
    'README',
    '更新记录',
    'Xiaxiaobai',
    selected?.name || '',
    ...tagList.value.slice(1),
    ...names,
  ].filter(Boolean)

    return {
      title,
      description,
      keywords,
      canonicalPath: '/tools',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Xiaxiaobai 软件文档中心',
        url: `${siteOrigin}/tools`,
        description,
        mainEntity: selected
          ? {
              '@type': 'SoftwareApplication',
              name: selected.name,
              softwareVersion: selected.version || undefined,
              applicationCategory: selected.tags.join(', '),
              operatingSystem: 'Windows, macOS, Linux',
              url: `${siteOrigin}/tools`,
            }
          : {
              '@type': 'ItemList',
              itemListElement: visible.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'SoftwareApplication',
                  name: item.name,
                  softwareVersion: item.version || undefined,
                },
              })),
            },
      },
    }
  },
  'tool-page'
)

watch(
  filteredSoftwares,
  (list) => {
    if (!list.length) {
      selectedId.value = ''
      clearDocs()
      return
    }
    if (!selectedId.value || !list.some((item) => item.id === selectedId.value)) {
      selectedId.value = list[0].id
    }
  },
  { immediate: true }
)

watch(
  selectedId,
  (id) => {
    if (!id) {
      clearDocs()
      return
    }
    void loadToolDocs(id)
  },
  { immediate: true }
)
</script>

<template>
  <div class="page">
    <div class="grid-bg" aria-hidden="true"></div>

    <header class="top panel">
      <div class="top-left">
        <div class="shell-path">~/xiaxiaobai/tools</div>
        <div class="title">Software Docs Console</div>
      </div>
      <div class="top-right">
        <a class="home" href="https://github.com/Xiaxiaobaii" target="_blank" rel="noreferrer">[ GitHub ]</a>
        <a class="home" href="/">[ Home ]</a>
      </div>
    </header>

    <main class="workspace">
      <aside class="panel bookmarks">
        <div class="panel-title mono">BOOKMARKS</div>
        <div class="row search-row">
          <span class="prompt">&gt;</span>
          <input v-model="query" class="search" placeholder="search name/version/desc/tags..." />
        </div>
        <div class="tags">
          <button
            v-for="tag in tagList"
            :key="tag"
            class="tag"
            :class="{ active: activeTag === tag }"
            @click="activeTag = tag"
          >
            {{ tag }}
          </button>
        </div>
        <div class="meta-line">
          <span class="meta-item">TOTAL {{ softwares.length }}</span>
          <span class="meta-item">VISIBLE {{ filteredSoftwares.length }}</span>
        </div>

        <div class="bookmark-list">
          <button
            v-for="item in filteredSoftwares"
            :key="item.id"
            class="bookmark"
            :class="{ active: selectedId === item.id }"
            @click="selectSoftware(item.id)"
          >
            <div class="bookmark-head">
              <span class="bookmark-name">{{ item.name }}</span>
              <span v-if="item.version" class="version mono">{{ item.version }}</span>
            </div>
            <div class="bookmark-id mono">{{ item.id }}</div>
            <div class="bookmark-desc">{{ item.desc }}</div>
            <div class="badges">
              <span v-for="tag in item.tags" :key="tag" class="badge">{{ tag }}</span>
            </div>
          </button>
          <div v-if="filteredSoftwares.length === 0" class="empty">没有匹配的软件</div>
        </div>
      </aside>

      <section class="panel reader">
        <div class="panel-title mono">README.md<span class="panel-name">{{ selectedSoftware?.name || '-' }}</span></div>
        <div v-if="!selectedSoftware" class="empty">请先从左侧选择一个软件</div>
        <div v-else-if="readmeLoading" class="empty">README 加载中…</div>
        <div v-else-if="readmeError" class="alert">{{ readmeError }}</div>
        <div v-else-if="!readmeMd" class="empty">暂无 README 内容</div>
        <div v-else class="md" v-html="readmeHtml"></div>
      </section>

      <section class="panel history">
        <div class="panel-title mono">CHANGELOG.md<span class="panel-name">{{ selectedSoftware?.id || '-' }}</span></div>
        <div v-if="!selectedSoftware" class="empty">请选择软件后查看更新记录</div>
        <div v-else-if="historyLoading" class="empty">更新记录加载中…</div>
        <div v-else-if="historyError" class="alert">{{ historyError }}</div>
        <div v-else-if="!historyMd" class="empty">暂无更新记录</div>
        <div v-else class="md" v-html="historyHtml"></div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100%;
  padding: 22px 16px 34px;
  background: #090f16;
  color: #c6d8ea;
  position: relative;
}

.grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.38;
  background:
    linear-gradient(rgba(40, 67, 92, 0.22) 1px, transparent 1px),
    linear-gradient(90deg, rgba(40, 67, 92, 0.22) 1px, transparent 1px);
  background-size: 24px 24px, 24px 24px;
}

.top {
  max-width: 1360px;
  margin: 0 auto 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.top-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.shell-path {
  font-size: 12px;
  color: #62eec4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  margin-bottom: 6px;
}

.title {
  font-size: 30px;
  font-weight: 700;
  color: #e7f3ff;
  letter-spacing: 1.5px;
}

.subtitle {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.8;
}

.home {
  text-decoration: none;
  border: 1px solid rgba(100, 158, 205, 0.45);
  border-radius: 8px;
  padding: 5px 12px;
  color: #9fd3ff;
  background: rgba(16, 29, 43, 0.9);
  transition: border-color 0.2s ease, background 0.2s ease;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.home:hover {
  border-color: rgba(151, 203, 245, 0.75);
  background: rgba(24, 40, 58, 0.95);
}

.workspace {
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr) minmax(280px, 360px);
  gap: 12px;
  position: relative;
  z-index: 1;
}

.panel {
  border: 1px solid rgba(77, 119, 154, 0.48);
  border-radius: 12px;
  background: rgba(11, 19, 28, 0.94);
  box-shadow: 0 12px 26px rgba(2, 7, 13, 0.55);
  padding: 12px;
}

.bookmarks,
.reader,
.history {
  min-height: 72vh;
  max-height: calc(100vh - 132px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-title {
  font-size: 12px;
  letter-spacing: 0.8px;
  color: #7eb8e8;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-name {
  color: #6ff4cd;
  font-size: 11px;
  opacity: 0.88;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-row {
  margin-bottom: 10px;
}

.prompt {
  font-size: 16px;
  color: #62eec4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.search {
  width: 100%;
  border: 1px solid rgba(78, 119, 156, 0.48);
  border-radius: 8px;
  padding: 9px 10px;
  background: rgba(5, 11, 19, 0.95);
  color: #d7e8f9;
  outline: none;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.search::placeholder {
  color: rgba(151, 184, 214, 0.7);
}

.tags {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.tag {
  border: 1px solid rgba(84, 128, 166, 0.4);
  border-radius: 7px;
  padding: 4px 9px;
  background: rgba(12, 23, 35, 0.95);
  color: #c2d7ea;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.tag:hover {
  border-color: rgba(117, 172, 219, 0.78);
}

.tag.active {
  border-color: rgba(95, 225, 180, 0.8);
  color: #79f8d4;
  background: rgba(10, 39, 37, 0.78);
}

.meta-line {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin: 10px 0;
}

.meta-item {
  font-size: 11px;
  border: 1px solid rgba(80, 127, 169, 0.35);
  border-radius: 7px;
  padding: 3px 7px;
  color: #84badf;
  background: rgba(14, 27, 39, 0.82);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.bookmark-list {
  margin-top: 4px;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 3px;
}

.bookmark {
  border: 1px solid rgba(74, 117, 152, 0.46);
  border-left: 3px solid rgba(74, 117, 152, 0.78);
  border-radius: 9px;
  background: linear-gradient(160deg, rgba(13, 23, 34, 0.96), rgba(8, 16, 25, 0.96));
  color: inherit;
  text-align: left;
  padding: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.bookmark:hover {
  border-color: rgba(126, 184, 230, 0.82);
  transform: translateX(2px);
}

.bookmark.active {
  border-color: rgba(112, 233, 194, 0.9);
  border-left-color: rgba(112, 233, 194, 0.95);
  box-shadow: 0 8px 16px rgba(2, 13, 11, 0.38);
}

.bookmark-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: space-between;
}

.bookmark-name {
  font-weight: 700;
  color: #e6f3ff;
}

.version {
  font-size: 11px;
  border: 1px solid rgba(95, 152, 198, 0.5);
  border-radius: 6px;
  padding: 1px 6px;
  color: #95c9f4;
  background: rgba(18, 32, 46, 0.95);
}

.bookmark-id {
  margin-top: 4px;
  font-size: 11px;
  color: #6ea8d5;
}

.bookmark-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: #a8c0d8;
}

.badges {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid rgba(65, 105, 141, 0.45);
  background: rgba(11, 29, 44, 0.95);
  color: #88c3f2;
}

.reader .md,
.history .md {
  flex: 1;
  overflow: auto;
  padding-right: 2px;
}

.empty {
  margin-top: 8px;
  border: 1px dashed rgba(84, 127, 164, 0.5);
  border-radius: 9px;
  padding: 14px 10px;
  color: #89b6db;
  font-size: 13px;
  text-align: center;
}

.alert {
  margin-top: 8px;
  border: 1px solid rgba(198, 90, 90, 0.5);
  border-radius: 9px;
  padding: 11px 12px;
  background: rgba(58, 21, 21, 0.52);
  color: #ffb2b2;
  line-height: 1.5;
  font-size: 13px;
}

.md :deep(*) {
  max-width: 100%;
}

.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4) {
  color: #e7f4ff;
}

.md :deep(p),
.md :deep(li) {
  color: #b8ccdf;
  line-height: 1.65;
}

.md :deep(pre) {
  overflow: auto;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid rgba(86, 127, 163, 0.42);
  background: rgba(6, 13, 21, 0.98);
}

.md :deep(code) {
  background: rgba(13, 30, 45, 0.92);
  padding: 2px 6px;
  border-radius: 6px;
}

.md :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.md :deep(th),
.md :deep(td) {
  border: 1px solid rgba(85, 126, 163, 0.35);
  padding: 8px;
}

.md :deep(a) {
  color: #77d6ff;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 1140px) {
  .workspace {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  }

  .history {
    grid-column: 1 / -1;
    min-height: 320px;
    max-height: none;
  }
}

@media (max-width: 840px) {
  .page {
    padding: 18px 12px 28px;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .bookmarks,
  .reader,
  .history {
    min-height: 340px;
    max-height: none;
  }
}
</style>
