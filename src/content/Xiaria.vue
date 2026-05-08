<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import '../lib/All.css'
import { Ipget } from '../lib/Http'
import { usePageSeo } from '../lib/Seo'

const IP = Ipget()

usePageSeo(
  () => ({
    title: 'Xiaxiaobai | Xiaria',
    description: '上传文件并获取临时链接，支持历史记录与快速复制。',
    keywords: ['文件上传', '临时链接', 'Xiaria', '文件分享'],
    canonicalPath: '/aria',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Xiaria 临时文件分享',
      url: `${location.protocol}//${location.host}/aria`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Windows, macOS, Linux',
    },
  }),
  'xiaria-page'
)

type HistoryItem = {
  id: string
  filename: string
  url: string
  createdAt: number
}

const HISTORY_KEY = 'shiz_xiaria_history_v1'
const HISTORY_LIMIT = 30

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const maxBytes = ref<number | null>(null)

const state = ref<'idle' | 'checking' | 'uploading' | 'done' | 'error'>('idle')
const progress = ref(0)
const errorMessage = ref('')
const resultFilename = ref('')
const history = ref<HistoryItem[]>([])

const toast = ref('')

let activeXhr: XMLHttpRequest | null = null

function showToast(message: string) {
  toast.value = message
  setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 1800)
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  const precision = i === 0 ? 0 : value < 10 ? 2 : 1
  return `${value.toFixed(precision)} ${units[i]}`
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}

function makeId() {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {}
  return `hist_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const BLOG_RE = /^(?<title>.+)-(?<author>.+)\.blogdownload$/i

const blogMeta = computed(() => {
  const name = selectedFile.value?.name ?? ''
  const match = BLOG_RE.exec(name)
  const title = match?.groups?.title
  const author = match?.groups?.author
  if (!title || !author) return null
  return { title, author }
})

const fileName = computed(() => selectedFile.value?.name ?? '尚未选择文件')
const fileSizeText = computed(() => (selectedFile.value ? formatBytes(selectedFile.value.size) : '-'))
const limitText = computed(() => (maxBytes.value ? formatBytes(maxBytes.value) : '未知'))
const isBusy = computed(() => state.value === 'checking' || state.value === 'uploading')

const resultUrl = computed(() => {
  if (!resultFilename.value) return ''
  return `${IP}/api/GetTempFile?filename=${encodeURIComponent(resultFilename.value)}`
})

function resetStatus() {
  state.value = 'idle'
  progress.value = 0
  errorMessage.value = ''
  resultFilename.value = ''
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.item(0) ?? null
  resetStatus()
}

function clearFile() {
  if (isBusy.value) return
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  resetStatus()
}

async function refreshLimit() {
  try {
    const res = await fetch(`${IP}/api/GetTempFileSize`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`获取限制失败 (${res.status})`)
    const text = await res.text()
    const n = Number.parseInt(text, 10)
    if (!Number.isFinite(n) || n <= 0) throw new Error('服务器返回的大小限制无效')
    maxBytes.value = n
    return n
  } catch (err: unknown) {
    maxBytes.value = null
    const message = err instanceof Error ? err.message : '获取限制失败'
    showToast(message)
    return null
  }
}

function readJsonSafe(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function uploadWithXhr(formData: FormData) {
  return new Promise<{ filename: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    activeXhr = xhr

    xhr.timeout = 2 * 60 * 1000
    xhr.open('POST', `${IP}/api/updateTempFile`)

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      progress.value = Math.min(99, Math.round((e.loaded / e.total) * 100))
    }

    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.onabort = () => reject(new Error('已取消上传'))
    xhr.ontimeout = () => reject(new Error('上传超时'))

    xhr.onload = () => {
      const data = readJsonSafe(xhr.responseText)
      const ok = xhr.status >= 200 && xhr.status < 300
      if (!ok) {
        const message = `上传失败 (${xhr.status})`
        reject(new Error(message))
        return
      }

      if (data?.err === true) {
        const message = data?.message ? String(data.message) : '上传失败'
        reject(new Error(message))
        return
      }

      const filename = data?.body?.filename ? String(data.body.filename) : ''
      if (!filename) {
        reject(new Error('上传成功但未返回文件名'))
        return
      }
      resolve({ filename })
    }

    xhr.send(formData)
  })
}

async function startUpload() {
  if (!selectedFile.value) {
    showToast('请先选择文件')
    return
  }
  if (isBusy.value) return

  errorMessage.value = ''
  resultFilename.value = ''
  progress.value = 0
  state.value = 'checking'

  const limit = await refreshLimit()
  if (limit && selectedFile.value.size >= limit) {
    state.value = 'error'
    errorMessage.value = `文件过大：${formatBytes(selectedFile.value.size)}（限制 ${formatBytes(limit)}）`
    return
  }

  const formData = new FormData()
  formData.append('filename', selectedFile.value.name)
  formData.append('file', selectedFile.value)

  try {
    state.value = 'uploading'
    const { filename } = await uploadWithXhr(formData)
    progress.value = 100
    resultFilename.value = filename
    const url = `${IP}/api/GetTempFile?filename=${encodeURIComponent(filename)}`
    const displayName = selectedFile.value?.name || filename
    pushHistory(displayName, url)
    state.value = 'done'
    showToast('上传成功')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '上传失败'
    if (message === '已取消上传') {
      state.value = 'idle'
      progress.value = 0
      errorMessage.value = ''
      showToast('已取消上传')
      return
    }
    state.value = 'error'
    errorMessage.value = message
  } finally {
    activeXhr = null
  }
}

function cancelUpload() {
  if (!activeXhr) return
  activeXhr.abort()
}

async function copyResult() {
  if (!resultUrl.value) return
  await copyToClipboard(resultUrl.value)
}

async function copyToClipboard(text: string) {
  const value = String(text ?? '')
  if (!value) return

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
      showToast('已复制链接')
      return
    }
  } catch (err: unknown) {
    console.error('clipboard.writeText failed:', err)
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (!ok) throw new Error('document.execCommand(copy) failed')
    showToast('已复制链接')
  } catch (err: unknown) {
    console.error('copy fallback failed:', err)
    showToast('复制失败（请检查浏览器权限/是否 HTTPS）')
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    const cleaned: HistoryItem[] = parsed
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
      .map((i) => ({
        id: typeof i.id === 'string' ? i.id : makeId(),
        filename: typeof i.filename === 'string' ? i.filename : '',
        url: typeof i.url === 'string' ? i.url : '',
        createdAt: typeof i.createdAt === 'number' ? i.createdAt : Date.now(),
      }))
      .filter((i) => i.filename && i.url)
      .slice(0, HISTORY_LIMIT)
    history.value = cleaned
  } catch {}
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(0, HISTORY_LIMIT)))
  } catch {}
}

async function checkTempFile(url: string) {
  const controller = new AbortController()
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Range: 'bytes=0-0' },
      signal: controller.signal,
    })
    try {
      await res.body?.cancel()
    } catch {}
    return res.status
  } catch {
    return null
  } finally {
    controller.abort()
  }
}

async function pruneHistory() {
  const snapshot = history.value
  if (snapshot.length === 0) return
  const kept: HistoryItem[] = []
  let removed = 0
  for (const item of snapshot) {
    const status = await checkTempFile(item.url)
    if (status === 404) {
      removed += 1
      continue
    }
    kept.push(item)
  }
  if (history.value !== snapshot) return
  if (removed > 0) {
    history.value = kept
    saveHistory()
    showToast(`已移除 ${removed} 条失效记录`)
  }
}

function pushHistory(displayName: string, url: string) {
  const item: HistoryItem = { id: makeId(), filename: displayName, url, createdAt: Date.now() }
  history.value = [item, ...history.value.filter((h) => h.url !== item.url)].slice(0, HISTORY_LIMIT)
  saveHistory()
}

function removeHistory(id: string) {
  history.value = history.value.filter((h) => h.id !== id)
  saveHistory()
  showToast('已删除')
}

function clearHistory() {
  history.value = []
  saveHistory()
  showToast('已清空')
}

onMounted(() => {
  void refreshLimit()
  loadHistory()
  void pruneHistory()
})

onBeforeUnmount(() => {
  if (activeXhr) activeXhr.abort()
})
</script>

<template>
  <div class="page">
    <header class="top">
      <div class="top-left">
        <div class="title">Micro Aria</div>
        <div class="subtitle">上传文件并获取临时链接（大小限制：{{ limitText }}）</div>
      </div>
      <a class="home" href="/">返回主页</a>
    </header>

    <section class="panel">
      <div class="row">
        <label class="btn primary" :class="{ disabled: isBusy }" for="file">选择文件</label>
        <button class="btn" :disabled="isBusy" @click="refreshLimit">刷新限制</button>
        <button v-if="isBusy" class="btn danger" @click="cancelUpload">取消上传</button>
        <button v-else class="btn" :disabled="!selectedFile" @click="clearFile">清空</button>
      </div>

      <input
        ref="fileInput"
        id="file"
        name="file"
        type="file"
        class="file"
        :disabled="isBusy"
        @change="onFileChange"
      />

      <div class="info">
        <div class="line">
          <div class="k">文件</div>
          <div class="v mono">{{ fileName }}</div>
        </div>
        <div class="line">
          <div class="k">大小</div>
          <div class="v mono">{{ fileSizeText }}</div>
        </div>
        <div class="line">
          <div class="k">服务器</div>
          <div class="v mono">{{ IP }}</div>
        </div>
        <div v-if="blogMeta" class="hint">
          已识别为博客文件（`标题-作者.blogdownload`）：将以 `filename={{ blogMeta.title }}`、`author={{ blogMeta.author }}` 上传
        </div>
      </div>

      <div class="row" style="margin-top: 12px">
        <button class="btn primary" :disabled="!selectedFile || isBusy" @click="startUpload">上传</button>
      </div>

      <div v-if="state === 'uploading'" class="progress-wrap">
        <div class="progress">
          <div class="bar" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-text">{{ progress }}%</div>
      </div>

      <div v-if="state === 'error' && errorMessage" class="alert">{{ errorMessage }}</div>
    </section>

    <section v-if="state === 'done' && resultUrl" class="panel">
      <div class="form-title">分配链接</div>
      <div class="result">
        <input class="input" :value="resultUrl" readonly />
        <div class="row" style="margin-top: 10px">
          <button class="btn primary" @click="copyResult">复制链接</button>
          <a class="btn" :href="resultUrl" target="_blank" rel="noreferrer">打开链接</a>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div class="form-title" style="margin-bottom: 0">历史分配</div>
        <button class="btn danger" :disabled="history.length === 0" @click="clearHistory">清空历史</button>
      </div>

      <div v-if="history.length === 0" class="empty">暂无历史记录</div>
      <div v-else class="history">
        <div v-for="item in history" :key="item.id" class="history-item">
          <div class="history-main">
            <div class="history-fn mono">{{ item.filename }}</div>
            <div class="history-meta">{{ formatTime(item.createdAt) }}</div>
            <div class="history-url mono">{{ item.url }}</div>
          </div>
          <div class="row history-actions">
            <button class="btn primary" @click="copyToClipboard(item.url)">复制</button>
            <a class="btn" :href="item.url" target="_blank" rel="noreferrer">打开</a>
            <button class="btn danger" @click="removeHistory(item.id)">删除</button>
          </div>
        </div>
      </div>
    </section>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
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
  max-width: 860px;
  margin: 0 auto 18px;
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
  max-width: 860px;
  margin: 12px auto;
  padding: 14px;
  border: 1px solid rgba(30, 30, 30, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 10px rgba(126, 125, 125, 0.25);
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

.btn.danger {
  border-color: rgba(170, 60, 60, 0.45);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.info {
  margin-top: 14px;
  border-top: 1px solid rgba(30, 30, 30, 0.12);
  padding-top: 12px;
}

.line {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 10px;
  align-items: center;
  padding: 6px 0;
}

.k {
  opacity: 0.8;
  font-size: 13px;
}

.v {
  word-break: break-all;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.hint {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.85;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.4);
  border: 1px dashed rgba(30, 30, 30, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
}

.progress-wrap {
  margin-top: 14px;
}

.progress {
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(30, 30, 30, 0.2);
  background: rgba(255, 255, 255, 0.5);
  position: relative;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: rgba(60, 120, 200, 0.6);
  transition: width 0.15s linear;
}

.progress-text {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.alert {
  margin-top: 14px;
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

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.input {
  width: 100%;
  border: 1px solid rgba(30, 30, 30, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.6);
  outline: unset;
  font-size: 14px;
  box-sizing: border-box;
}

.empty {
  opacity: 0.7;
  padding: 10px 0;
}

.history {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.history-item {
  border: 1px solid rgba(30, 30, 30, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
  padding: 12px;
}

.history-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-fn {
  font-size: 14px;
}

.history-meta {
  font-size: 12px;
  opacity: 0.75;
}

.history-url {
  font-size: 12px;
  opacity: 0.85;
  word-break: break-all;
}

.history-actions {
  margin-top: 10px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease, filter 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
  filter: blur(2px);
}

.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9999;
  max-width: min(440px, calc(100vw - 36px));
  border: 1px solid rgba(60, 120, 200, 0.35);
  background: rgba(255, 255, 255, 0.96);
  padding: 12px 14px 12px 16px;
  border-radius: 14px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18);
  user-select: none;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
  overflow: hidden;
  overflow-wrap: anywhere;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.toast::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, rgba(60, 120, 200, 0.95), rgba(90, 160, 235, 0.95));
}
</style>
