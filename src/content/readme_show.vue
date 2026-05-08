<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import '../lib/All.css'
import { marked } from 'marked/marked.min.js'
import { Ipget } from '../lib/Http'
import { usePageSeo } from '../lib/Seo'

type GetToolResponse = {
  error: boolean
  message: string
  body: string
}

const route = useRoute()
const IP = Ipget()

const readmeLoading = ref(false)
const historyLoading = ref(false)
const readmeError = ref('')
const historyError = ref('')

const readmeMd = ref('')
const historyMd = ref('')
const readmeHtml = ref('')
const historyHtml = ref('')

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

async function fetchToolMd(name: string, version?: string) {
  const url = new URL(`${IP}/api/get_tool`)
  url.searchParams.set('name', name)
  if (version) url.searchParams.set('version', version)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`请求失败 (${res.status})`)

  const data = (await res.json()) as unknown as Partial<GetToolResponse> & Record<string, unknown>
  if (!data || typeof data !== 'object') throw new Error('返回数据异常')
  const errorValue = (data as Record<string, unknown>).error
  const isError =
    errorValue === true ||
    errorValue === 1 ||
    errorValue === 'true' ||
    errorValue === '1' ||
    errorValue === 'false' ||
    errorValue === '0'
      ? errorValue === true || errorValue === 1 || errorValue === 'true' || errorValue === '1'
      : Boolean(errorValue)
  if (isError) throw new Error(String((data as Record<string, unknown>).message ?? '接口返回错误'))
  const body = (data as Record<string, unknown>).body ?? (data as Record<string, unknown>).Body ?? ''
  return typeof body === 'string' ? body : JSON.stringify(body)
}

async function loadPage(id: string) {
  const name = String(id || '').trim()
  if (!name) return

  readmeLoading.value = true
  historyLoading.value = true
  readmeError.value = ''
  historyError.value = ''
  readmeMd.value = ''
  historyMd.value = ''
  readmeHtml.value = ''
  historyHtml.value = ''

  const versionParamRaw = route.query.version
  const historyVersion =
    typeof versionParamRaw === 'string' && versionParamRaw.trim() ? versionParamRaw.trim() : 'all'

  const [readmeRes, historyRes] = await Promise.allSettled([
    fetchToolMd(name),
    fetchToolMd(name, historyVersion),
  ])

  if (readmeRes.status === 'fulfilled') readmeMd.value = readmeRes.value
  else readmeError.value = readmeRes.reason instanceof Error ? readmeRes.reason.message : 'README 加载失败'

  if (historyRes.status === 'fulfilled') historyMd.value = historyRes.value
  else
    historyError.value = historyRes.reason instanceof Error ? historyRes.reason.message : '更新历史加载失败'

  readmeHtml.value = readmeMd.value ? await renderMarkdown(readmeMd.value) : ''
  historyHtml.value = historyMd.value ? await renderMarkdown(historyMd.value) : ''

  readmeLoading.value = false
  historyLoading.value = false
}

const pageId = computed(() => String(route.params.page ?? ''))
const queryTitle = computed(() => {
  const raw = route.query.title
  return typeof raw === 'string' ? raw.trim() : ''
})
const queryVersion = computed(() => {
  const raw = route.query.version
  return typeof raw === 'string' ? raw.trim() : ''
})
const title = computed(() => queryTitle.value || pageId.value || '软件详情')

usePageSeo(
  () => {
    const basePath = `/tools/${encodeURIComponent(pageId.value || '')}`
    const canonicalPath = queryVersion.value
      ? `${basePath}?version=${encodeURIComponent(queryVersion.value)}`
      : basePath
    const pageTitle = `Xiaxiaobai | Tool | ${title.value}`
    const description = queryVersion.value
      ? `${title.value} 的文件更新历史（版本：${queryVersion.value}）。`
      : `${title.value} 的 README 与文件更新历史。`
    return {
      title: pageTitle,
      description,
      keywords: [title.value, pageId.value, 'README', '更新历史', '软件下载'],
      canonicalPath,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: title.value,
        codeRepository: `${location.protocol}//${location.host}${basePath}`,
        url: `${location.protocol}//${location.host}${canonicalPath}`,
        description,
      },
    }
  },
  'tool-readme-page'
)

watch(
  [pageId, () => route.query.version],
  () => void loadPage(pageId.value),
  { immediate: true }
)
</script>

<template>
  <div class="page">
    <header class="top">
      <div class="top-left">
        <div class="title">{{ title }}</div>
        <div class="subtitle">README / 文件更新历史</div>
      </div>
      <div class="top-right">
        <RouterLink class="home" to="/tools">返回列表</RouterLink>
        <a class="home" href="https://github.com/Xiaxiaobaii" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </header>

    <section class="panel">
      <div class="meta">
        <div class="line">
          <div class="k">工具 ID</div>
          <div class="v mono">{{ pageId }}</div>
        </div>
        <div v-if="queryVersion" class="line">
          <div class="k">版本</div>
          <div class="v mono">{{ queryVersion }}</div>
        </div>
      </div>
    </section>

    <section class="panel labeled">
      <div class="panel-label">README</div>
      <div v-if="readmeLoading" class="empty">加载中…</div>
      <div v-else-if="readmeError" class="alert">{{ readmeError }}</div>
      <div v-else-if="!readmeMd" class="empty">暂无 README</div>
      <div v-else class="md" v-html="readmeHtml"></div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div class="form-title" style="margin-bottom: 0">更新历史</div>
      </div>

      <div v-if="historyLoading" class="empty">加载中…</div>
      <div v-else-if="historyError" class="alert">{{ historyError }}</div>
      <div v-else-if="!historyMd" class="empty">暂无更新记录</div>
      <div v-else class="md" v-html="historyHtml"></div>
    </section>
  </div>
</template>

<style scoped>
.page {
  min-height: 100%;
  padding: 28px 18px 60px;
  background: #e6dece;
  color: rgb(89, 89, 89);
  box-shadow: inset 0 0 35px 1px rgb(175 167 148);
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 1100px;
  margin: 0 auto 18px;
}

.top-right {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.title {
  font-size: 34px;
  letter-spacing: 4px;
}

.subtitle {
  opacity: 0.8;
  margin-top: 6px;
  font-size: 14px;
}

.home {
  text-decoration: unset;
  border: 1px solid rgba(90, 90, 90, 0.5);
  border-radius: 18px;
  padding: 6px 12px;
  color: inherit;
  transition: all 0.2s ease-in;
  user-select: none;
}

.home:hover {
  background: rgba(255, 255, 255, 0.3);
}

.panel {
  max-width: 1100px;
  margin: 12px auto;
  padding: 14px;
  border: 1px solid rgba(30, 30, 30, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 10px rgba(126, 125, 125, 0.25);
}

.panel.labeled {
  position: relative;
  margin-top: 22px;
}

.panel-label {
  position: absolute;
  left: 14px;
  top: -10px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(89, 89, 89, 0.8);
  background: #e6dece;
  border: 1px solid rgba(30, 30, 30, 0.18);
  user-select: none;
  letter-spacing: 0.6px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  border: 1px solid rgba(30, 30, 30, 0.25);
  border-radius: 12px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  user-select: none;
  text-decoration: unset;
  color: inherit;
  transition: all 0.2s ease-in;
  font-size: 13px;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.9);
}

.btn.primary {
  border-color: rgba(30, 30, 30, 0.35);
  background: rgba(255, 255, 255, 0.85);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 10px;
  align-items: center;
  padding: 4px 0;
}

.k {
  opacity: 0.8;
  font-size: 13px;
}

.v {
  line-height: 1.5;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(30, 30, 30, 0.18);
  background: rgba(255, 255, 255, 0.45);
}

.empty {
  opacity: 0.7;
  padding: 12px 0 0;
}

.alert {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(170, 60, 60, 0.35);
  background: rgba(255, 255, 255, 0.55);
  color: rgba(120, 30, 30, 0.95);
  line-height: 1.5;
}

.form-title {
  font-size: 18px;
  margin-bottom: 10px;
}

.md :deep(*) {
  max-width: 100%;
}

.md :deep(pre) {
  overflow: auto;
  max-width: 100%;
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(30, 30, 30, 0.12);
}

.md :deep(code) {
  background: rgba(255, 255, 255, 0.55);
  padding: 2px 6px;
  border-radius: 8px;
}

.md :deep(a) {
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
