<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import "../lib/All.css"
import { useRoute, useRouter } from 'vue-router'
import { marked } from "marked/marked.min.js"
import { Base91 } from '@hpcc-js/wasm-base91';

const loaded = ref(false)
const route = useRoute();
const router = useRouter()
function getPageParam() {
  return typeof route.params.page === "string" ? route.params.page : undefined
}

const vw = ref(document.documentElement.clientWidth)
const page = ref(getPageParam());
const blogs = ref([])
const allBlogs = ref([])
const mainLoad = ref(false)
const mainHtml = ref("")
const mainDivRef = ref(null)
const articleLoading = ref(false)
const activeCloudTag = ref("")
let bookMode = false
const isMob = computed(() => vw.value <= 768)
const mobileAsideOpen = ref(false)
const dark = ref(false)
const asideWidth = computed(() => (isMob.value ? '86%' : '28%'))
const mainWidth = computed(() => (isMob.value ? '100%' : '72%'))
const mainPWidth = computed(() => (isMob.value ? '90%' : '70%'))
const displayBlogs = computed(() => (loaded.value ? blogs.value : []))
const showTips = computed(() => loaded.value && !bookMode && isDefaultBlogId(page.value))

const asideTransform = computed(() => {
  if (!isMob.value) return ''
  return mobileAsideOpen.value ? 'translateX(0)' : 'translateX(-105%)'
})

let touchStartX = 0
let touchStartY = 0
let touchStartedOnDrawer = false
let touchListenersEnabled = false
const touchListenerOptions = { passive: true }

const SiteOrigin = `${location.protocol}//${location.host}`
const THEME_KEY = "blog_theme_mode"
const MAIN_ID = "Normal"
const TOK_RE = /[\s,，、|/]+/
const copyStateTimers = new Map()
const parsedTagCache = new Map()
let resizeRaf = 0
let tagCloudFingerprint = ""
let articleLoadToken = 0

function toBlogId(id) {
  return String(id || MAIN_ID)
}

function isDefaultBlogId(id) {
  return toBlogId(id) === MAIN_ID
}

function toBlogPathById(id) {
  return isDefaultBlogId(id) ? "/blog" : `/blog/${encodeURIComponent(String(id))}`
}

function setNormalFallbackMain() {
  const html = buildNormalFallbackHtml()
  setMainContent({ id: MAIN_ID, html })
  loaded.value = true
  updateTips()
}

async function syncBlogRoute(id, replace = false) {
  if (bookMode) return
  const targetPath = toBlogPathById(id)
  const hasQuery = Object.keys(route.query || {}).length > 0
  if (route.path === targetPath && !hasQuery) return
  const navigate = replace ? router.replace : router.push
  try {
    await navigate({ path: targetPath, query: {} })
  } catch (err) {
    // ignore duplicated navigation errors
  }
}

function getThemeDark() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === "dark") return true
    if (value === "light") return false
  } catch (err) {
    // ignore storage errors in privacy mode
  }
  return false
}

function persistTheme(isDark) {
  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light")
  } catch (err) {
    // ignore storage errors in privacy mode
  }
}

function getBlogSource() {
  return allBlogs.value.length ? allBlogs.value : blogs.value
}

function splitTokenText(text) {
  return String(text || "")
    .split(TOK_RE)
    .map((item) => item.trim())
    .filter(Boolean)
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeCodeText(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

function buildCodeRowsHtml(rawCode) {
  const lines = String(rawCode || '').split('\n')
  if (!lines.length) lines.push('')
  return lines
    .map((line, index) => {
      const safeLine = line.length ? escapeHtml(line) : '&nbsp;'
      return `<span class="blog-code-row"><span class="blog-code-ln">${index + 1}</span><span class="blog-code-tx">${safeLine}</span></span>`
    })
    .join('')
}

function enhanceCodeBlocksInHtml(html) {
  if (!html || html.indexOf('<pre') === -1) return html
  const root = document.createElement('div')
  root.innerHTML = html
  const pres = root.querySelectorAll('pre')
  if (!pres.length) return html

  pres.forEach((pre) => {
    if (!(pre instanceof HTMLElement)) return
    if (pre.classList.contains('blog-code-ready')) return

    const originalCode = pre.querySelector('code')
    const raw = normalizeCodeText(originalCode?.textContent || pre.textContent || '')

    const nextPre = document.createElement('pre')
    Array.from(pre.attributes).forEach((attr) => {
      if (attr.name === 'data-raw-code') return
      nextPre.setAttribute(attr.name, attr.value)
    })
    nextPre.classList.add('blog-code-ready')
    nextPre.setAttribute('data-raw-code', raw)

    const scrollWrap = document.createElement('div')
    scrollWrap.className = 'blog-code-scroll'

    const nextCode = document.createElement('code')
    nextCode.className = ['blog-code-content', originalCode?.className || '']
      .filter(Boolean)
      .join(' ')
    nextCode.innerHTML = buildCodeRowsHtml(raw)
    scrollWrap.appendChild(nextCode)
    nextPre.appendChild(scrollWrap)

    const copyBtn = document.createElement('button')
    copyBtn.type = 'button'
    copyBtn.className = 'blog-code-copy-btn'
    copyBtn.textContent = '复制'
    copyBtn.setAttribute('aria-label', '复制代码')
    copyBtn.setAttribute('title', '复制代码')
    nextPre.appendChild(copyBtn)

    pre.replaceWith(nextPre)
  })

  return root.innerHTML
}

function resetCopyButton(btn) {
  btn.textContent = '复制'
  btn.classList.remove('is-copied', 'is-failed')
}

function setCopyButtonState(btn, text, className) {
  btn.textContent = text
  btn.classList.remove('is-copied', 'is-failed')
  if (className) btn.classList.add(className)
  const timer = copyStateTimers.get(btn)
  if (timer) clearTimeout(timer)
  copyStateTimers.set(
    btn,
    setTimeout(() => {
      resetCopyButton(btn)
      copyStateTimers.delete(btn)
    }, 1800)
  )
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      // fall through to execCommand fallback
    }
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch (err) {
    return false
  }
}

async function onMainClick(event) {
  if (!(event.target instanceof Element)) return
  const btn = event.target.closest('.blog-code-copy-btn')
  if (!(btn instanceof HTMLButtonElement)) return
  const pre = btn.closest('pre.blog-code-ready')
  if (!(pre instanceof HTMLElement)) return
  const raw = pre.getAttribute('data-raw-code') || ''
  const ok = await copyTextToClipboard(raw)
  if (ok) setCopyButtonState(btn, '已复制', 'is-copied')
  else setCopyButtonState(btn, '复制失败', 'is-failed')
}

function onTouchStart(e) {
  if (!isMob.value) return
  if (!mobileAsideOpen.value) return
  const t = e.touches && e.touches[0]
  if (!t) return
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchStartedOnDrawer =
    e.target instanceof Element && (!!e.target.closest('#Aside') || !!e.target.closest('#aside_mask'))
}

function onTouchEnd(e) {
  if (!isMob.value) return
  if (!mobileAsideOpen.value || !touchStartedOnDrawer) return
  const t = e.changedTouches && e.changedTouches[0]
  if (!t) return
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  touchStartedOnDrawer = false
  if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < -45) setAsideOpen(false)
}

function enableTouchListeners() {
  if (touchListenersEnabled) return
  document.addEventListener('touchstart', onTouchStart, touchListenerOptions)
  document.addEventListener('touchend', onTouchEnd, touchListenerOptions)
  touchListenersEnabled = true
}

function disableTouchListeners() {
  if (!touchListenersEnabled) return
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
  touchListenersEnabled = false
}

function syncTouchListeners() {
  if (isMob.value && mobileAsideOpen.value) enableTouchListeners()
  else disableTouchListeners()
}

function onResize() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    vw.value = document.documentElement.clientWidth
    syncTouchListeners()
    resizeRaf = 0
  })
}

async function httpGetAsync(path) {
  const normalized = String(path || "").replace(/^\/+/, "")
  const requestUrl = `${SiteOrigin}/${normalized}`
  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
    const raw = await response.text()
    let data = raw
    try {
      data = JSON.parse(raw)
    } catch (err) {
      // plain text payload
    }
    return { ok: response.ok, status: response.status, data, raw }
  } catch (err) {
    return { ok: false, status: 0, data: null, raw: "", error: err }
  }
}

function unwrapResponseData(input) {
  if (input && typeof input === "object" && "data" in input) return input.data
  return input
}

function findFirstArray(candidates) {
  for (const item of candidates) {
    if (Array.isArray(item)) return item.slice()
  }
  return []
}

function toText(value) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function pickText(...values) {
  for (const value of values) {
    const text = toText(value).trim()
    if (text) return text
  }
  return ""
}

function normalizeBlogItem(raw) {
  if (typeof raw === "string") {
    const id = raw.trim()
    if (!id) return null
    return { id, name: id, author: "", tags: "", createTime: "" }
  }
  if (!raw || typeof raw !== "object") return null
  const obj = raw
  const id = pickText(obj.id, obj.ID, obj.blogId, obj.slug, obj.name, obj.title)
  if (!id) return null
  return {
    id,
    name: pickText(obj.name, obj.title, obj.blogName, id),
    author: pickText(obj.author, obj.Author),
    tags: pickText(obj.tags, obj.Tags),
    createTime: pickText(obj.createTime, obj.createdAt, obj.date, obj.CreateTime),
  }
}

function normalizeBlogList(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => normalizeBlogItem(item))
    .filter(Boolean)
}

function extractMainList(data) {
  const payload = unwrapResponseData(data)
  if (Array.isArray(payload)) return payload.slice()
  return findFirstArray([
    payload?.data?.main,
    payload?.main,
    payload?.list,
    payload?.rows,
    payload?.items,
    payload?.data,
    payload?.result,
    payload,
  ])
}

function reorderMainList(list) {
  const source = Array.isArray(list) ? list.slice() : []
  if (source.length <= 1) return source
  const top = source.shift()
  source.reverse()
  if (top !== undefined) source.unshift(top)
  return source
}

const base91 = Base91.load();

async function toArticleHtml(rawText) {
  let tex = rawText.trim()
  let text = (await base91).decode(tex);
  text = new TextDecoder().decode(text);
  if (!text) return ""
  try {
    const rendered = await marked.parse(text)
    return typeof rendered === "string" ? rendered : String(rendered || "")
  } catch (err) {
    return `<pre>${escapeHtml(text)}</pre>`
  }
}

function buildNormalFallbackHtml() {
  const source = getBlogSource()
  if (!source.length) {
    return `<section class="normal-fallback"><p>默认文章未获取到，当前暂无文章。</p></section>`
  }
  const items = source
    .map((item) => {
      const id = String(item?.id || "").trim()
      if (!id) return ""
      const name = escapeHtml(String(item?.name || id).trim() || id)
      const meta = [item?.author, item?.createTime]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ")
      const metaHtml = meta
        ? ` <span class="normal-fallback-meta">(${escapeHtml(meta)})</span>`
        : ""
      return `<li><a href="/blog/${encodeURIComponent(id)}">${name}</a>${metaHtml}</li>`
    })
    .filter(Boolean)
    .join("")
  if (!items) {
    return `<section class="normal-fallback"><p>默认文章未获取到，当前暂无文章。</p></section>`
  }
  return `<section class="normal-fallback"><p>默认文章未获取到，已展示文章目录。</p><ul>${items}</ul></section>`
}

function applyLoadedLists(list, { syncAll = true, bookMode: enterBook = false } = {}) {
  allBlogs.value = syncAll ? list.slice() : []
  blogs.value = list
  tagCloudFingerprint = ""
  activeCloudTag.value = ""
  loaded.value = true
  if (enterBook) bookMode = true
}

async function loadList({ keepExistingOnEmpty = false } = {}) {
  const data = await httpGetAsync("api/blog")
  const list = reorderMainList(normalizeBlogList(extractMainList(data)))
  if (keepExistingOnEmpty && !list.length && blogs.value.length) return false
  applyLoadedLists(list)
  return list.length > 0
}

async function loadArticleContent(id) {
  const targetId = String(id || "").trim()
  if (!targetId) return false
  const token = ++articleLoadToken
  articleLoading.value = true
  try {
    const data = (await httpGetAsync(`api/blog?id=${encodeURIComponent(targetId)}`)).data
    const html = await toArticleHtml(data)
    if (token !== articleLoadToken) return false
    
    const finalHtml = enhanceCodeBlocksInHtml(String(html || "").trim())
    if (!finalHtml) return false
    setMainContent({ id: targetId, html: finalHtml })
    loaded.value = true
    updateTips()
    return true
  } finally {
    if (token === articleLoadToken) articleLoading.value = false
  }
}

async function boot() {
  const hasDirectPage = page.value !== undefined
  await loadList()
  if (hasDirectPage) {
    const ok = await loadArticleContent(toBlogId(page.value))
    if (!ok) setNormalFallbackMain()
  } else {
    const ok = await loadArticleContent(MAIN_ID)
    if (!ok) setNormalFallbackMain()
  }
  if (mainLoad.value) updateTips()
}

onMounted(() => {
  dark.value = getThemeDark()
  addEventListener("resize", onResize)
  if (mainDivRef.value) mainDivRef.value.addEventListener('click', onMainClick)
  syncTouchListeners()
  void boot()
})

onBeforeUnmount(() => {
  removeEventListener("resize", onResize)
  if (mainDivRef.value) mainDivRef.value.removeEventListener('click', onMainClick)
  copyStateTimers.forEach((timer) => clearTimeout(timer))
  copyStateTimers.clear()
  disableTouchListeners()
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  removeTipsHost()
})

watch(
  () => route.params.page,
  (routePage) => {
    if (bookMode) return
    const nextPage = typeof routePage === "string" ? routePage : undefined
    const targetId = nextPage === undefined ? MAIN_ID : nextPage
    const currentId = page.value === undefined ? MAIN_ID : String(page.value)
    if (targetId === currentId) return
    if (!loaded.value) {
      page.value = nextPage
      return
    }
    void openBlog(targetId, { syncRoute: false })
  }
)

function toggleDarkTheme() {
  dark.value = !dark.value
  persistTheme(dark.value)
}

function setAsideOpen(open) {
  if (!isMob.value) return
  mobileAsideOpen.value = open
  syncTouchListeners()
}

function openFromAside(id) {
  setAsideOpen(false)
  void openBlog(id)
}

function clearMainView() {
  articleLoadToken += 1
  articleLoading.value = false
  mainHtml.value = ""
  mainLoad.value = false
  if (!bookMode) page.value = undefined
  removeTipsHost()
  resetReadingScroll()
}

function goBlogHome() {
  if (isMob.value) setAsideOpen(false)
  clearMainView()
  void openBlog(MAIN_ID)
}

function setMainContent({ id, html }) {
  if (!bookMode) {
    page.value = isDefaultBlogId(id) ? undefined : id
  }
  mainHtml.value = marked.parse(html)
  mainLoad.value = true
  resetReadingScroll()
}

function scrollTargetsToTop() {
  const root = mainDivRef.value
  if (root instanceof HTMLElement) {
    root.scrollTop = 0
    if (typeof root.scrollTo === "function") root.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }

  const main = getMainContentElement()
  if (main instanceof HTMLElement) {
    main.scrollTop = 0
    if (typeof main.scrollTo === "function") main.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }

  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo({ top: 0, left: 0, behavior: "auto" })
}

function resetReadingScroll() {
  void nextTick(() => {
    scrollTargetsToTop()
    requestAnimationFrame(() => {
      scrollTargetsToTop()
    })
  })
}

async function openBlog(id, options = {}) {
  const targetId = toBlogId(id)
  const { replaceRoute = false, syncRoute = true } = options
  if (isDefaultBlogId(targetId)) {
    articleLoadToken += 1
    articleLoading.value = false
    const loaded = await loadArticleContent(MAIN_ID)
    if (!loaded) setNormalFallbackMain()
    else updateTips()
  } else {
    const ok = await loadArticleContent(targetId)
    if (!ok) return
  }
  if (syncRoute) await syncBlogRoute(targetId, replaceRoute)
}

function hashText(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

function buildWordCloudHtml(counter) {
  if (!counter.size) return "暂无标签"
  const tags = Array.from(counter.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0], "zh-Hans-CN")
    })
    .slice(0, 36)
  const values = tags.map((i) => i[1])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const levelRange = max - min || 1

  const resetClass = activeCloudTag.value ? "tag-cloud-item size-1 tag-cloud-reset" : "tag-cloud-item size-1 tag-cloud-reset is-active"
  const nodes = tags
    .map(([tag, count]) => {
      const level = 1 + Math.round(((count - min) / levelRange) * 4)
      const hash = hashText(tag)
      const tx = (hash % 7) - 3
      const ty = ((hash >> 3) % 5) - 2
      const rot = ((hash >> 5) % 7) - 3
      const activeClass = activeCloudTag.value === tag ? " is-active" : ""
      return `<span class="tag-cloud-item size-${level}${activeClass}" data-tag="${escapeHtml(tag)}" style="--tx:${tx}px;--ty:${ty}px;--rot:${rot}deg">${escapeHtml(tag)}</span>`
    })
    .join("")
  return `<span class="${resetClass}" data-tag="">全部</span>${nodes}`
}

function getTagCloudFingerprint(source) {
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    const item = source[i] || {}
    const text = `${item.id ?? ''}|${item.tags ?? ''}`
    for (let j = 0; j < text.length; j++) {
      hash = (hash * 31 + text.charCodeAt(j)) >>> 0
    }
  }
  return `${source.length}:${activeCloudTag.value}:${hash}`
}

function parseItemTags(item) {
  const key = `${String(item?.id || '')}::${String(item?.tags || '')}`
  const cached = parsedTagCache.get(key)
  if (cached) return cached
  const next = splitTokenText(item?.tags)
  parsedTagCache.set(key, next)
  return next
}

function applyTagFilter(tag) {
  if (bookMode) return false
  const source = getBlogSource()
  if (!source.length) return false
  const nextTag = String(tag || '').trim()
  if (!nextTag || nextTag === activeCloudTag.value) {
    activeCloudTag.value = ""
    blogs.value = source.slice()
    updateTips()
    return true
  }
  activeCloudTag.value = nextTag
  blogs.value = source.filter((item) => parseItemTags(item).includes(nextTag))
  updateTips()
  return true
}

function onTagCloudClick(event) {
  if (!(event.target instanceof Element)) return
  const node = event.target.closest(".tag-cloud-item")
  if (!node) return
  const tag = node.getAttribute("data-tag") || ""
  const changed = applyTagFilter(tag)
  if (changed && isMob.value) setAsideOpen(true)
}

function updateTips() {
  if (!showTips.value) {
    removeTipsHost()
    return
  }
  void nextTick(() => {
    if (!showTips.value) return
    renderTips()
  })
}

function getMainContentElement() {
  const root = mainDivRef.value
  if (!(root instanceof HTMLElement)) return null
  const node = root.querySelector("#Main")
  return node instanceof HTMLElement ? node : null
}

function findDirectChildById(parent, id) {
  const children = parent.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child instanceof HTMLElement && child.id === id) return child
  }
  return null
}

function ensureTipsHost() {
  const mainEl = getMainContentElement()
  if (!mainEl) return null
  let host = findDirectChildById(mainEl, "MainTips")
  if (!host) {
    host = document.createElement("section")
    host.id = "MainTips"

    const randomEl = document.createElement("div")
    randomEl.id = "random"
    host.appendChild(randomEl)

    const tagsEl = document.createElement("div")
    tagsEl.id = "tags"
    host.appendChild(tagsEl)

    mainEl.appendChild(host)
  }
  const randomEl = host.querySelector("#random")
  const tagsEl = host.querySelector("#tags")
  if (!(randomEl instanceof HTMLElement) || !(tagsEl instanceof HTMLElement)) return null
  return { host, randomEl, tagsEl }
}

function updateTotalText() {
  const mainEl = getMainContentElement()
  if (!mainEl) return
  const totalEl = mainEl.querySelector("p#total")
  if (!(totalEl instanceof HTMLElement)) return
  totalEl.textContent = `文章总数：${blogs.value.length}`
}

function removeTipsHost() {
  const mainEl = getMainContentElement()
  if (!mainEl) return
  const host = findDirectChildById(mainEl, "MainTips")
  if (!(host instanceof HTMLElement)) return
  const tagsEl = host.querySelector("#tags")
  if (tagsEl instanceof HTMLElement) {
    tagsEl.removeEventListener("click", onTagCloudClick)
  }
  host.remove()
}

function renderTips() {
  const tips = ensureTipsHost()
  if (!tips) return
  updateTotalText()
  const { tagsEl, randomEl } = tips
  const source = getBlogSource()
  const tagCounter = new Map()
  source.forEach((item) => {
    parseItemTags(item).forEach((tag) => {
      tagCounter.set(tag, (tagCounter.get(tag) || 0) + 1)
    })
  })

  if (tagsEl.getAttribute("data-bound") !== "1") {
    tagsEl.addEventListener("click", onTagCloudClick)
    tagsEl.setAttribute("data-bound", "1")
  }
  const fingerprint = getTagCloudFingerprint(source)
  if (fingerprint !== tagCloudFingerprint || !tagsEl.firstElementChild) {
    tagsEl.innerHTML = buildWordCloudHtml(tagCounter)
    tagCloudFingerprint = fingerprint
  }

  const randomSource = blogs.value.length ? blogs.value : source
  const random = randomSource[Math.floor(Math.random() * randomSource.length)]
  randomEl.textContent = ""
  if (!random) return
  const a = document.createElement("a")
  a.href = `/blog/${encodeURIComponent(random.id)}`
  a.textContent = "随便看看"
  randomEl.appendChild(a)
}
</script>
<template>
  <div id="body" :class="{ 'theme-dark': dark }">
    <header id="mobile_header" v-if="isMob">
      <button class="mh_btn" @click="setAsideOpen(!mobileAsideOpen)" aria-label="切换列表">
        <span class="mh_icon">{{ mobileAsideOpen ? '×' : '≡' }}</span>
      </button>
      <button class="mh_title mh_title_btn" @click="goBlogHome" aria-label="返回 Blog 首页">Xiaxiaobai Blog</button>
      <button class="mh_btn" @click="toggleDarkTheme" :aria-label="dark ? '切换到浅色' : '切换到深色'">
        <svg v-if="dark" class="mh_svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="1.8" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <svg v-else class="mh_svg" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
            fill="currentColor" />
        </svg>
      </button>
    </header>
    <div id="aside_mask" v-if="isMob && mobileAsideOpen" @click="setAsideOpen(false)"></div>
    <aside id="Aside" class="Allin" :style="{ 'width': asideWidth, 'transform': asideTransform }">
      <div class="blog_aside_title" v-if="!isMob || mobileAsideOpen">
        <button class="blog_home_btn" @click="goBlogHome" aria-label="返回 Blog 首页">Xiaxiaobai Blog</button>
        <hr class="blog_title_rule">
      </div>
      <TransitionGroup name="list" tag="ul" class="blog_list">
        <li v-for="blog in displayBlogs" class="blog_aside_div" :key="blog.id" @click="openFromAside(blog.id)">
          <div style="font-size: 28px;margin-left: 10px;padding-right:10px;padding-top: 4px;overflow: hidden;">{{
            blog.name }}</div>
          <span class="footnote" style="left: 5px; right: unset;">{{ blog.tags }}</span>
          <span class="footnote">{{ blog.author }} {{ blog.createTime }}</span>
        </li>
      </TransitionGroup>
    </aside>
    <main ref="mainDivRef" class="Allin" id="MainDiv" :style="{ 'width': mainWidth }">
      <Transition name="main" mode="out-in" @after-enter="updateTips">
        <div id="Main" :key="page === undefined ? MAIN_ID : String(page)" :style="{ width: mainPWidth }"
          v-if="mainLoad && loaded" v-html="mainHtml">
        </div>
      </Transition>
      <div v-if="mainLoad && page !== undefined && !articleLoading">
        <hr>
        </hr>
        <h3 style="justify-self: right;margin-right: 30px;text-align: right;">© 2022-2026 Xiaxiaobai. All Rights
          Reserved.</h3>
        <h3 style="justify-self: right;margin-right: 30px;text-align: right;">Not By AI. Powered by Xiaxiaobai</h3>
      </div>


    </main>
    <button id="dark_toggle" v-if="!isMob" @click="toggleDarkTheme" :aria-label="dark ? '切换到浅色' : '切换到深色'"
      :title="dark ? '切换到浅色' : '切换到深色'">
      <svg v-if="dark" class="dt_svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <svg v-else class="dt_svg" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
          fill="currentColor" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.footnote {
  font-size: 12px;
  color: var(--text-muted);
  position: absolute;
  right: 3px;
  bottom: 3px;
}

.normal-fallback {
  margin: 10px 0 0;
}

.normal-fallback p {
  margin: 0 0 12px;
  color: var(--text-muted);
}

.normal-fallback ul {
  margin: 0;
  padding-left: 22px;
}

.normal-fallback li {
  margin: 8px 0;
}

.normal-fallback a {
  color: inherit;
}

.normal-fallback-meta {
  color: var(--text-muted);
  font-size: 0.9rem;
}


#dark_toggle {
  position: fixed;
  user-select: none;
  right: 0;
  top: 0;
  height: 50px;
  width: 50px;
  z-index: 20;
  margin: 10px;
  border-radius: 999px;
  border: 1px solid var(--toggle-border);
  background: var(--toggle-bg);
  box-shadow: var(--toggle-shadow);
  color: var(--text-main);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, color 0.2s ease;
}

#dark_toggle:hover {
  transform: translateY(-1px);
  background: var(--toggle-bg-hover);
}

#dark_toggle:active {
  transform: translateY(0);
}

#dark_toggle:focus-visible {
  outline: 2px solid var(--focus-outline);
  outline-offset: 2px;
}

.dt_svg {
  width: 24px;
  height: 24px;
  opacity: 0.9;
}

#mobile_header {
  display: none;
}

#aside_mask {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: var(--mobile-header, 0px);
  user-select: none;
  z-index: 25;
  background: var(--mask-bg);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  touch-action: none;
}

#body {
  --bg-main: #e6dece;
  --bg-panel: #e6dece;
  --text-main: rgb(89, 89, 89);
  --text-muted: rgb(126, 125, 125);
  --toggle-border: rgba(30, 30, 30, 0.18);
  --toggle-bg: rgba(255, 255, 255, 0.45);
  --toggle-bg-hover: rgba(255, 255, 255, 0.65);
  --toggle-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
  --focus-outline: rgba(80, 140, 220, 0.7);
  --mask-bg: rgba(0, 0, 0, 0.12);
  --body-inset-shadow: inset 0 0 35px 1px rgb(175 167 148);
  --panel-shadow: 0 0 5px #7e7d7d;
  --aside-shadow: 0 0 3px #7e7d7d;
  --header-bg: rgba(255, 255, 255, 0.45);
  --header-border: rgba(30, 30, 30, 0.12);
  --header-btn-border: rgba(30, 30, 30, 0.14);
  --header-btn-bg: rgba(255, 255, 255, 0.55);
  --main-text-shadow: 0 0 .5px #828282;
  --rule-color: #000;
  --pre-text: #000;
  --pre-border: rgba(30, 30, 30, 0.24);
  --pre-bg: rgba(255, 255, 255, 0.34);
  --pre-bg-soft: rgba(236, 229, 214, 0.62);
  --pre-head-bg: rgba(115, 92, 55, 0.12);
  --pre-shadow: 0 10px 24px rgba(72, 62, 49, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.46);
  --pre-ln-border: rgba(30, 30, 30, 0.18);
  --pre-ln-text: rgba(30, 30, 30, 0.55);
  --inline-code-bg: rgba(107, 84, 50, 0.1);
  --inline-code-border: rgba(107, 84, 50, 0.25);
  --inline-code-text: #5d4a2e;
  --pre-copy-bg: rgba(255, 255, 255, 0.34);
  --pre-copy-bg-hover: rgba(255, 255, 255, 0.56);
  --pre-copy-border: rgba(30, 30, 30, 0.18);
  --pre-copy-text: rgba(30, 30, 30, 0.7);
  --pre-copy-ok-bg: rgba(101, 157, 93, 0.14);
  --pre-copy-ok-border: rgba(77, 130, 70, 0.32);
  --pre-copy-fail-bg: rgba(194, 95, 86, 0.12);
  --pre-copy-fail-border: rgba(168, 75, 67, 0.3);
  --del-mask-bg: #000;
  --del-mask-text: #000;
  --del-mask-hover: #828282;
  --selection-bg: #ab3b3a;
  --selection-text: #e6dece;
  --selection-shadow: 0 0 .75px #e6dece;
  --tag-border: rgba(70, 70, 70, 0.18);
  --tag-bg: rgba(255, 255, 255, 0.35);
  --tag-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  --tag-shadow-hover: 0 3px 8px rgba(0, 0, 0, 0.14);
  --tag-active-border: rgba(52, 100, 164, 0.38);
  --tag-active-bg: rgba(86, 130, 191, 0.16);
  --tag-active-shadow: 0 2px 10px rgba(52, 100, 164, 0.2);
  color-scheme: light;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  text-align: justify;
  font-size: 1.15rem;
  display: flex;
  background-color: var(--bg-main);
  transition: background-color 0.35s ease, color 0.35s ease, box-shadow 0.35s ease;
  color: var(--text-main);
  box-shadow: var(--body-inset-shadow);
}

#body.theme-dark {
  --bg-main: #1f2126;
  --bg-panel: #242731;
  --text-main: #d7d9dd;
  --text-muted: #a7aab3;
  --toggle-border: rgba(219, 222, 229, 0.24);
  --toggle-bg: rgba(31, 34, 42, 0.7);
  --toggle-bg-hover: rgba(42, 45, 56, 0.9);
  --toggle-shadow: 0 12px 28px rgba(0, 0, 0, 0.44);
  --focus-outline: rgba(132, 181, 255, 0.85);
  --mask-bg: rgba(0, 0, 0, 0.4);
  --body-inset-shadow: inset 0 0 35px 1px rgba(5, 8, 14, 0.8);
  --panel-shadow: 0 0 5px rgba(0, 0, 0, 0.72);
  --aside-shadow: 0 0 3px rgba(0, 0, 0, 0.72);
  --header-bg: rgba(31, 34, 42, 0.75);
  --header-border: rgba(219, 222, 229, 0.16);
  --header-btn-border: rgba(219, 222, 229, 0.22);
  --header-btn-bg: rgba(53, 57, 69, 0.8);
  --main-text-shadow: 0 0 .5px rgba(232, 234, 238, 0.35);
  --rule-color: #d5d8df;
  --pre-text: #ebedf3;
  --pre-border: rgba(219, 222, 229, 0.24);
  --pre-bg: rgba(16, 22, 32, 0.9);
  --pre-bg-soft: rgba(36, 43, 58, 0.9);
  --pre-head-bg: rgba(255, 255, 255, 0.07);
  --pre-shadow: 0 10px 24px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --pre-ln-border: rgba(219, 222, 229, 0.2);
  --pre-ln-text: rgba(219, 222, 229, 0.56);
  --inline-code-bg: rgba(142, 181, 241, 0.14);
  --inline-code-border: rgba(142, 181, 241, 0.34);
  --inline-code-text: #d9e8ff;
  --pre-copy-bg: rgba(42, 47, 58, 0.52);
  --pre-copy-bg-hover: rgba(56, 61, 74, 0.74);
  --pre-copy-border: rgba(219, 222, 229, 0.22);
  --pre-copy-text: rgba(233, 236, 243, 0.76);
  --pre-copy-ok-bg: rgba(68, 122, 92, 0.24);
  --pre-copy-ok-border: rgba(105, 171, 129, 0.38);
  --pre-copy-fail-bg: rgba(145, 72, 72, 0.24);
  --pre-copy-fail-border: rgba(214, 122, 122, 0.4);
  --del-mask-bg: #11141d;
  --del-mask-text: #11141d;
  --del-mask-hover: #aeb4c4;
  --selection-bg: #9a4a45;
  --selection-text: #f3ede3;
  --selection-shadow: 0 0 .75px rgba(243, 237, 227, 0.5);
  --tag-border: rgba(219, 222, 229, 0.24);
  --tag-bg: rgba(255, 255, 255, 0.1);
  --tag-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  --tag-shadow-hover: 0 3px 8px rgba(0, 0, 0, 0.45);
  --tag-active-border: rgba(119, 175, 255, 0.56);
  --tag-active-bg: rgba(99, 146, 224, 0.24);
  --tag-active-shadow: 0 2px 10px rgba(31, 76, 144, 0.35);
  color-scheme: dark;
}

.blog_aside_title {
  height: 6%;
  line-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  font-size: 20px;
}

.blog_home_btn {
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
}

.blog_home_btn:focus-visible,
.mh_title_btn:focus-visible {
  outline: 2px solid var(--focus-outline);
  outline-offset: 2px;
}

.blog_title_rule {
  mask-image: linear-gradient(to right, transparent, black, transparent);
  margin: 0;
  height: 3px;
  background-color: var(--rule-color);
  width: 100%;
  opacity: 0.8;
}

.blog_list {
  overflow-x: hidden;
  font-family: 'Noto Sans CJK SC', 'Noto Sans CJK', 'Source Han Sans', source-han-sans-simplified-c, sans-serif;
  white-space: nowrap;
  text-overflow: ellipsis;
  height: 92%;
}

.blog_aside_div {
  box-shadow: var(--panel-shadow);
  height: 10%;
  position: relative;
  margin: 12px 2px;
  display: block;
  transition: box-shadow 0.35s ease;
}


#Aside {
  box-shadow: var(--aside-shadow);
  transition: box-shadow 0.35s ease, background-color 0.35s ease;
}

@media (max-width: 768px) {
  #body {
    --mobile-header: calc(52px + env(safe-area-inset-top));
    padding-top: var(--mobile-header);
  }

  #mobile_header {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    height: var(--mobile-header);
    box-sizing: border-box;
    padding-top: env(safe-area-inset-top);
    padding-left: calc(10px + env(safe-area-inset-left));
    padding-right: calc(10px + env(safe-area-inset-right));
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    z-index: 40;
    background: var(--header-bg);
    color: var(--text-main);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--header-border);
    transition: background-color 0.35s ease, border-color 0.35s ease, color 0.35s ease;
  }

  .mh_btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid var(--header-btn-border);
    background: var(--header-btn-bg);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .mh_icon {
    font-size: 22px;
    line-height: 1;
    opacity: 0.9;
  }

  .mh_svg {
    width: 22px;
    height: 22px;
    opacity: 0.9;
  }

  .mh_title {
    flex: 1;
    text-align: center;
    font-size: 13px;
    letter-spacing: 1px;
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mh_title_btn {
    border: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: inherit;
  }

  #Aside {
    position: fixed;
    left: 0;
    top: var(--mobile-header);
    bottom: 0;
    z-index: 30;
    max-width: 420px;
    transition: transform 0.25s ease;
    will-change: transform;
    background-color: var(--bg-panel);
    overflow-y: auto;
    height: auto;
    box-sizing: border-box;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }
}

.Allin {
  position: relative;
  height: 100%;
  overflow-x: hidden;
  background-color: var(--bg-panel);
  box-shadow: var(--panel-shadow);
  transition: background-color 0.35s ease, box-shadow 0.35s ease;
}

#Main {
  padding: 0 10% 10% 5%;
  font-family: Noto Serif TC, Noto Serif SC, Georgia, STSong, serif;
  text-shadow: var(--main-text-shadow);
  width: 70%;
  text-indent: 2em;
  letter-spacing: 3px;
  line-height: 2;
}

@media (max-width: 768px) {
  #Main {
    padding: 0 5% 10% 5%;
  }
}

.list-enter-active,
.list-leave-active {
  transition: all 1s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-100px);
}

.main-enter-active,
.main-leave-active {
  transition: all 0.9s ease-out;
}

.main-leave-to {
  transform: translateX(-100px);
  opacity: 0;
}

.main-enter-from {
  transform: translateX(100px);
  opacity: 0;
}
</style>
<style>
@media (max-width: 768px) {
  h1 {
    letter-spacing: 0;
  }

  #Main {
    line-height: 1.5;
  }
}

pre {
  text-indent: 0em;
  border-radius: 16px 6px 16px 6px;
  color: var(--pre-text, #000);
  padding: 20px;
  user-select: text;
  font-size: 1rem;
  overflow: auto;
  border: 1px solid var(--pre-border, rgba(30, 30, 30, 0.24));
  background:
    linear-gradient(to bottom, var(--pre-head-bg, rgba(115, 92, 55, 0.12)) 0 34px, transparent 34px),
    linear-gradient(155deg, var(--pre-bg, rgba(255, 255, 255, 0.34)), var(--pre-bg-soft, rgba(236, 229, 214, 0.62)));
  box-shadow: var(--pre-shadow, 0 10px 24px rgba(72, 62, 49, 0.14));
  font-family: Noto Serif TC, Noto Serif SC, Georgia, STSong, serif;
  text-shadow: none;
  transition: color 0.35s ease, background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}

pre.blog-code-ready {
  position: relative;
  text-indent: 0;
  letter-spacing: 0;
  padding: 0;
  line-height: 1.5;
  overflow: hidden;
}

pre.blog-code-ready .blog-code-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 34px 0 11px;
}

pre.blog-code-ready .blog-code-content {
  
  display: block;
  text-indent: 0;
  letter-spacing: 0;
  line-height: 1.6;
  width: 100%;
  min-width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  padding-top: 33px;
}

pre.blog-code-ready .blog-code-row {
  display: flex;
  align-items: flex-start;
  min-height: 1.65em;
}

pre.blog-code-ready .blog-code-ln {
  min-width: 2.4ch;
  margin-right: 8px;
  padding: 0 7px 0 9px;
  color: var(--pre-ln-text, rgba(30, 30, 30, 0.55));
  border-right: 1px solid var(--pre-ln-border, rgba(30, 30, 30, 0.18));
  text-align: right;
  user-select: none;
}

pre.blog-code-ready .blog-code-tx {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  padding-right: 14px;
  white-space: break-spaces;
  overflow-wrap: anywhere;
}

pre.blog-code-ready .blog-code-copy-btn {
  position: absolute;
  right: 8px;
  top: 7px;
  height: 22px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid var(--pre-copy-border, rgba(30, 30, 30, 0.22));
  background: var(--pre-copy-bg, rgba(255, 255, 255, 0.82));
  color: var(--pre-copy-text, rgba(30, 30, 30, 0.85));
  font-size: 0.68rem;
  line-height: 22px;
  letter-spacing: 0;
  cursor: pointer;
  opacity: 0.5;
  z-index: 2;
  transition: opacity 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

pre.blog-code-ready:hover .blog-code-copy-btn,
pre.blog-code-ready:focus-within .blog-code-copy-btn {
  opacity: 0.92;
}

pre.blog-code-ready .blog-code-copy-btn:hover {
  background: var(--pre-copy-bg-hover, rgba(255, 255, 255, 0.95));
  opacity: 1;
}

pre.blog-code-ready .blog-code-copy-btn.is-copied {
  background: var(--pre-copy-ok-bg, rgba(101, 157, 93, 0.22));
  border-color: var(--pre-copy-ok-border, rgba(77, 130, 70, 0.42));
  opacity: 0.96;
}

pre.blog-code-ready .blog-code-copy-btn.is-failed {
  background: var(--pre-copy-fail-bg, rgba(194, 95, 86, 0.2));
  border-color: var(--pre-copy-fail-border, rgba(168, 75, 67, 0.44));
  opacity: 0.96;
}

pre.blog-code-ready .blog-code-copy-btn:focus-visible {
  outline: 2px solid var(--focus-outline, rgba(80, 140, 220, 0.7));
  outline-offset: 2px;
}

#Main code:not(.blog-code-content) {
  display: inline;
  text-indent: 0;
  letter-spacing: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85em;
  padding: 0.1em 0.42em;
  border-radius: 6px;
  border: 1px solid var(--inline-code-border, rgba(107, 84, 50, 0.25));
  background: var(--inline-code-bg, rgba(107, 84, 50, 0.1));
  color: var(--inline-code-text, #5d4a2e);
  text-shadow: none;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

del {
  background-color: var(--del-mask-bg, #000);
  margin: 0px 3px;
  color: var(--del-mask-text, #000);
  text-shadow: none;
  transition: color 0.5s;
}

del:hover {
  color: var(--del-mask-hover, #828282);
  text-shadow: var(--main-text-shadow, 0 0 .5px #828282);
}

ul {
  padding-inline-start: 0;
  margin: 10px;
  height: 100%;
}

*::selection {
  background-color: var(--selection-bg, #ab3b3a);
  color: var(--selection-text, #e6dece);
  text-shadow: var(--selection-shadow, 0 0 .75px #e6dece);
}

a {
  color: var(--text-main, rgb(89, 89, 89)) !important;
  transition: color 0.35s ease;
}

#body #Main a {
  overflow-wrap: anywhere;
  word-break: break-all;
  letter-spacing: 0;
}

#MainTips {
  text-indent: 0;
  margin-top: 12px;
}

#random {
  margin: 0 0 10px;
  text-indent: 2em;
  letter-spacing: 0;
}

#tags {
  margin: 16px 0 8px;
  margin-left: 2em;
  text-indent: 0;
  padding-left: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  line-height: 1.25;
}

#tags .tag-cloud-item {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--tag-border, rgba(70, 70, 70, 0.18));
  background: var(--tag-bg, rgba(255, 255, 255, 0.35));
  box-shadow: var(--tag-shadow, 0 1px 2px rgba(0, 0, 0, 0.08));
  transform: translate(var(--tx, 0), var(--ty, 0)) rotate(var(--rot, 0deg));
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.35s ease, background-color 0.35s ease;
  cursor: pointer;
  user-select: none;
}

#tags .tag-cloud-item:hover {
  transform: translate(var(--tx, 0), calc(var(--ty, 0) - 1px)) rotate(var(--rot, 0deg));
  box-shadow: var(--tag-shadow-hover, 0 3px 8px rgba(0, 0, 0, 0.14));
}

#tags .tag-cloud-item.is-active {
  border-color: var(--tag-active-border, rgba(52, 100, 164, 0.38));
  background: var(--tag-active-bg, rgba(86, 130, 191, 0.16));
  box-shadow: var(--tag-active-shadow, 0 2px 10px rgba(52, 100, 164, 0.2));
}

#tags .tag-cloud-reset {
  opacity: 0.9;
}

#tags .size-1 {
  font-size: 0.9rem;
  opacity: 0.72;
}

#tags .size-2 {
  font-size: 1rem;
  opacity: 0.8;
}

#tags .size-3 {
  font-size: 1.1rem;
  opacity: 0.9;
}

#tags .size-4 {
  font-size: 1.22rem;
  opacity: 0.96;
}

#tags .size-5 {
  font-size: 1.34rem;
  opacity: 1;
  font-weight: 600;
}

th {
  text-align: center;
}

img {
  display: block;
  width: -webkit-fill-available;
}

@media (max-width: 768px) {
  #tags {
    gap: 8px 9px;
  }

  #tags .tag-cloud-item {
    padding: 3px 10px;
  }

  pre.blog-code-ready {
    width: 100%;
  }

  pre.blog-code-ready .blog-code-scroll {
    padding-top: 31px;
  }

  pre.blog-code-ready .blog-code-ln {
    margin-right: 7px;
    padding-left: 7px;
    padding-right: 6px;
  }

  pre.blog-code-ready .blog-code-copy-btn {
    right: 7px;
    top: 4px;
    height: 20px;
    line-height: 20px;
    padding: 0 7px;
    font-size: 0.64rem;
  }
}
</style>
