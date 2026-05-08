<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import "../lib/All.css";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import * as echarts from "echarts";
import { usePageSeo } from "../lib/Seo";
import { clearManagerToken, readManagerToken, saveManagerToken } from "../lib/managerAuth";

const IP = typeof window === "undefined" ? "" : `${location.protocol}//${location.host}`;
const route = useRoute();
const router = useRouter();

const tokenInput = ref("");
const tokenError = ref("");
const authPending = ref(false);
const rememberToken = ref(true);
const accessToken = ref(readManagerToken());

const totalRequests = ref(0);
const cpuLoad = ref(0);
const memoryMb = ref(0);
const memoryRate = ref(0);
const trendLabels = ref([]);
const trendValues = ref([]);
const trendLoading = ref(true);
const loading = ref(true);
const lastUpdated = ref("--");

const isLoginRoute = computed(() => route.path === "/manage/login");
const isAuthed = computed(() => !!accessToken.value.trim());
const showLogin = computed(() => isLoginRoute.value || !isAuthed.value);
const tokenPreview = computed(() => {
  const raw = accessToken.value.trim();
  if (!raw) return "--";
  if (raw.length <= 10) return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
  return `${raw.slice(0, 4)}***${raw.slice(-3)}`;
});

usePageSeo(
  () => ({
    title: showLogin.value ? "Xiaxiaobai | Manager Login" : "Xiaxiaobai | Manager",
    description: "服务状态、资源占用和主页访问趋势的管理面板。",
    keywords: ["管理面板", "监控", "访问统计", "Xiaxiaobai"],
    canonicalPath: showLogin.value ? "/manage/login" : "/manage",
    robots: "noindex,nofollow",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": showLogin.value ? "管理面板登录" : "管理面板",
      "url": `${location.protocol}//${location.host}${showLogin.value ? "/manage/login" : "/manage"}`,
    },
  }),
  "manager-page"
);

const chartEl = ref(null);
let mainChart = null;
let resizeRaf = 0;
let autoTimer = 0;

const cards = computed(() => [
  {
    title: "总请求数",
    value: totalRequests.value.toLocaleString(),
    suffix: "次",
    accent: "accent-1",
  },
  {
    title: "CPU 负载",
    value: cpuLoad.value.toFixed(2),
    suffix: "%",
    accent: "accent-2",
  },
  {
    title: "内存占用",
    value: memoryMb.value.toFixed(2),
    suffix: "MB",
    accent: "accent-3",
  },
  {
    title: "内存占用率",
    value: memoryRate.value.toFixed(2),
    suffix: "%",
    accent: "accent-4",
  },
]);

function markUpdated() {
  lastUpdated.value = new Date().toLocaleString("zh-CN", {
    hour12: false,
  });
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function saveTokenToStorage(token) {
  saveManagerToken(token, rememberToken.value);
  accessToken.value = readManagerToken();
}

function clearTokenStorage() {
  clearManagerToken();
  accessToken.value = "";
}

function safeReplace(path) {
  if (route.path === path) return;
  router.replace(path).catch(() => {});
}

function buildAuthConfig(params = {}) {
  const token = accessToken.value.trim();
  const merged = { ...params };
  if (token) merged.token = token;
  return {
    params: merged,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

async function authedGet(path, params = {}) {
  return axios.get(`${IP}/${path}`, buildAuthConfig(params));
}

function handleAuthError(err) {
  const status = Number(err?.response?.status || 0);
  if (status !== 401 && status !== 403) return false;
  tokenError.value = "token 无效或已失效，请重新登录";
  logout();
  return true;
}

function renderChart() {
  if (!mainChart) return;
  mainChart.setOption({
    animationDuration: 320,
    grid: { left: 34, right: 24, top: 46, bottom: 34 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(21, 42, 74, 0.9)",
      borderWidth: 0,
      textStyle: { color: "#edf5ff" },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trendLabels.value,
      axisLine: { lineStyle: { color: "rgba(69, 112, 173, 0.42)" } },
      axisLabel: { color: "rgba(46, 74, 113, 0.9)" },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(73, 118, 179, 0.18)" } },
      axisLabel: { color: "rgba(46, 74, 113, 0.9)" },
    },
    series: [
      {
        name: "主页访问",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        data: trendValues.value,
        itemStyle: { color: "#3c7ddd" },
        lineStyle: { width: 3, color: "#3c7ddd" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(60, 125, 221, 0.35)" },
            { offset: 1, color: "rgba(60, 125, 221, 0.03)" },
          ]),
        },
      },
    ],
  });
}

function parseTrend(json) {
  const source = json?.data && typeof json.data === "object" ? json.data : {};
  const entries = Object.entries(source).sort((a, b) =>
    String(a[0]).localeCompare(String(b[0]), "zh-Hans-CN")
  );
  const labels = [];
  const values = [];
  entries.forEach(([key, routes]) => {
    labels.push(key);
    const value = routes && typeof routes === "object" ? toSafeNumber(routes["/"]) : 0;
    values.push(value);
  });
  trendLabels.value = labels;
  trendValues.value = values;
  trendLoading.value = false;
  renderChart();
}

function loadDashboard() {
  if (!isAuthed.value || showLogin.value) return;
  loading.value = true;
  trendLoading.value = true;
  Promise.allSettled([
    authedGet("api/TimeConst", { begin: 7 }),
    authedGet("api/AnyConst"),
    authedGet("api/GetCpu"),
    authedGet("api/GetMemory"),
  ]).then((results) => {
    const [trendRes, totalRes, cpuRes, memoryRes] = results;

    if (trendRes.status === "fulfilled") {
      parseTrend(trendRes.value);
    } else if (!handleAuthError(trendRes.reason)) {
      trendLabels.value = [];
      trendValues.value = [];
      trendLoading.value = false;
    }

    if (totalRes.status === "fulfilled") {
      totalRequests.value = toSafeNumber(totalRes.value?.data);
    } else if (!handleAuthError(totalRes.reason)) {
      totalRequests.value = 0;
    }

    if (cpuRes.status === "fulfilled") {
      cpuLoad.value = toSafeNumber(cpuRes.value?.data);
    } else if (!handleAuthError(cpuRes.reason)) {
      cpuLoad.value = 0;
    }

    if (memoryRes.status === "fulfilled") {
      const total = toSafeNumber(memoryRes.value?.data?.total);
      const used = toSafeNumber(memoryRes.value?.data?.used);
      memoryMb.value = used / 1024 / 1024;
      memoryRate.value = total > 0 ? (used / total) * 100 : 0;
    } else if (!handleAuthError(memoryRes.reason)) {
      memoryMb.value = 0;
      memoryRate.value = 0;
    }

    loading.value = false;
    trendLoading.value = false;
    markUpdated();
    renderChart();
  });
}

function onResize() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    if (mainChart) mainChart.resize();
  });
}

function stopDashboard() {
  if (autoTimer) {
    window.clearInterval(autoTimer);
    autoTimer = 0;
  }
  window.removeEventListener("resize", onResize);
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = 0;
  if (mainChart) {
    mainChart.dispose();
    mainChart = null;
  }
}

async function startDashboard() {
  if (!isAuthed.value || showLogin.value) return;
  await nextTick();
  if (chartEl.value) {
    if (!mainChart) mainChart = echarts.init(chartEl.value);
    renderChart();
  }
  loadDashboard();
  if (!autoTimer) autoTimer = window.setInterval(loadDashboard, 45000);
  window.addEventListener("resize", onResize);
}

async function submitToken() {
  if (authPending.value) return;
  const token = tokenInput.value.trim();
  if (!token) {
    tokenError.value = "请输入 token";
    return;
  }
  authPending.value = true;
  tokenError.value = "";
  saveTokenToStorage(token);
  try {
    await authedGet("api/AnyConst");
    safeReplace("/manage");
    await startDashboard();
  } catch (err) {
    clearTokenStorage();
    tokenError.value = "token 校验失败，请确认后重试";
  } finally {
    authPending.value = false;
  }
}

function logout() {
  stopDashboard();
  clearTokenStorage();
  safeReplace("/manage/login");
}

watch(
  [isAuthed, isLoginRoute],
  ([authed, loginRoute]) => {
    if (authed && loginRoute) safeReplace("/manage");
    if (!authed && !loginRoute) safeReplace("/manage/login");
  },
  { immediate: true }
);

watch(
  showLogin,
  (loginMode) => {
    if (loginMode) {
      stopDashboard();
      return;
    }
    void startDashboard();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopDashboard();
});
</script>

<template>
  <div class="manager-page">
    <div v-if="showLogin" class="manager-shell login-shell">
      <section class="login-card">
        <h1>Manager Token Login</h1>
        <p>请输入管理 token 后进入管理面板</p>
        <label class="login-label" for="manager-token-input">Access Token</label>
        <input
          id="manager-token-input"
          v-model="tokenInput"
          class="token-input"
          type="password"
          placeholder="输入 token"
          @keydown.enter="submitToken"
        />
        <label class="remember-row">
          <input v-model="rememberToken" type="checkbox">
          <span>记住登录状态</span>
        </label>
        <p v-if="tokenError" class="token-error">{{ tokenError }}</p>
        <div class="login-actions">
          <RouterLink class="home-btn" to="/">返回主页</RouterLink>
          <button class="refresh-btn" :disabled="authPending" @click="submitToken">
            {{ authPending ? "校验中..." : "登录" }}
          </button>
        </div>
      </section>
    </div>

    <div v-else class="manager-shell">
      <header class="manager-header">
        <div class="header-main">
          <h1>管理面板</h1>
          <p>服务状态与主页访问趋势</p>
        </div>
        <div class="header-actions">
          <span class="updated-at">token {{ tokenPreview }}</span>
          <span class="updated-at">更新于 {{ lastUpdated }}</span>
          <div class="action-row">
            <button class="logout-btn" @click="logout">退出登录</button>
            <RouterLink class="home-btn" to="/">返回主页</RouterLink>
            <button class="refresh-btn" @click="loadDashboard">刷新数据</button>
          </div>
        </div>
      </header>

      <section class="metrics-grid">
        <article
          v-for="card in cards"
          :key="card.title"
          class="metric-card"
          :class="card.accent"
        >
          <div class="metric-title">{{ card.title }}</div>
          <div class="metric-value">
            <span>{{ card.value }}</span>
            <small>{{ card.suffix }}</small>
          </div>
        </article>
      </section>

      <section class="chart-panel">
        <div class="panel-title-row">
          <h2>主页访问数（近 7 天）</h2>
          <span v-if="loading || trendLoading" class="loading-dot">加载中...</span>
        </div>
        <div ref="chartEl" class="chart-host"></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.manager-page {
  min-height: 100%;
  padding: 26px 20px 30px;
  background: radial-gradient(circle at 12% 8%, #f2f8ff 0, #dceafd 44%, #d3e5ff 100%);
  color: #2a4366;
  box-sizing: border-box;
}

.manager-shell {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-shell {
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px);
}

.login-card {
  width: min(520px, 100%);
  border-radius: 16px;
  border: 1px solid rgba(73, 113, 167, 0.24);
  background: rgba(247, 252, 255, 0.84);
  box-shadow: 0 8px 30px rgba(35, 78, 132, 0.15);
  padding: 24px 22px;
}

.login-card h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: 1px;
}

.login-card p {
  margin: 10px 0 0;
  opacity: 0.82;
}

.login-label {
  display: block;
  margin-top: 18px;
  font-size: 13px;
  color: rgba(43, 70, 105, 0.84);
}

.token-input {
  margin-top: 8px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(71, 109, 162, 0.3);
  border-radius: 12px;
  background: rgba(251, 253, 255, 0.95);
  color: #24406a;
  font-size: 15px;
  padding: 10px 12px;
  outline: none;
}

.token-input:focus {
  border-color: rgba(58, 116, 196, 0.58);
  box-shadow: 0 0 0 3px rgba(56, 127, 222, 0.16);
}

.remember-row {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  font-size: 13px;
}

.token-error {
  margin-top: 10px;
  font-size: 13px;
  color: #8f3f2c;
}

.login-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 18px 14px;
  border-radius: 16px;
  border: 1px solid rgba(73, 113, 167, 0.24);
  background: rgba(246, 251, 255, 0.72);
  box-shadow: 0 8px 30px rgba(35, 78, 132, 0.12);
}

.header-main h1 {
  margin: 0;
  font-size: 34px;
  letter-spacing: 4px;
  line-height: 1.15;
}

.header-main p {
  margin: 8px 0 0;
  opacity: 0.84;
  letter-spacing: 1px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.updated-at {
  font-size: 12px;
  color: rgba(43, 70, 105, 0.78);
}

.refresh-btn {
  border: 1px solid rgba(66, 111, 170, 0.32);
  border-radius: 999px;
  background: linear-gradient(180deg, #f6fbff, #dcecff);
  color: #27456f;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 16px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  box-shadow: 0 4px 14px rgba(49, 92, 149, 0.18);
}

.refresh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(49, 92, 149, 0.24);
}

.refresh-btn:active {
  transform: translateY(0);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
  box-shadow: 0 4px 14px rgba(49, 92, 149, 0.18);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logout-btn {
  border: 1px solid rgba(66, 111, 170, 0.32);
  border-radius: 999px;
  background: linear-gradient(180deg, #f9fcff, #e2efff);
  color: #27456f;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 16px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  box-shadow: 0 4px 14px rgba(49, 92, 149, 0.18);
  line-height: 1;
}

.logout-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(49, 92, 149, 0.24);
}

.logout-btn:active {
  transform: translateY(0);
}

.home-btn {
  border: 1px solid rgba(66, 111, 170, 0.32);
  border-radius: 999px;
  background: linear-gradient(180deg, #f9fcff, #e4f1ff);
  color: #27456f;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 16px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  box-shadow: 0 4px 14px rgba(49, 92, 149, 0.18);
  text-decoration: none;
  line-height: 1;
}

.home-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(49, 92, 149, 0.24);
}

.home-btn:active {
  transform: translateY(0);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  border-radius: 14px;
  border: 1px solid rgba(70, 110, 162, 0.2);
  background: rgba(249, 253, 255, 0.86);
  box-shadow: 0 8px 22px rgba(47, 88, 142, 0.12);
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
}

.metric-card::after {
  content: "";
  position: absolute;
  right: -22px;
  top: -22px;
  width: 78px;
  height: 78px;
  border-radius: 999px;
  opacity: 0.14;
}

.metric-title {
  font-size: 13px;
  color: rgba(43, 70, 105, 0.76);
}

.metric-value {
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.metric-value span {
  font-size: 30px;
  letter-spacing: 1px;
  font-weight: 700;
  line-height: 1;
}

.metric-value small {
  font-size: 13px;
  opacity: 0.75;
}

.accent-1::after { background: #4a92f1; }
.accent-2::after { background: #3f78d5; }
.accent-3::after { background: #6a9fda; }
.accent-4::after { background: #3f8ccf; }

.chart-panel {
  border-radius: 16px;
  border: 1px solid rgba(73, 113, 167, 0.24);
  background: rgba(248, 252, 255, 0.78);
  box-shadow: 0 10px 30px rgba(35, 78, 132, 0.12);
  padding: 14px 14px 10px;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panel-title-row h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}

.loading-dot {
  font-size: 12px;
  color: rgba(43, 70, 105, 0.78);
}

.chart-host {
  width: 100%;
  height: 430px;
}

@media (max-width: 1080px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .manager-page {
    padding: 16px 10px 18px;
  }

  .login-shell {
    min-height: calc(100vh - 34px);
  }

  .manager-header {
    flex-direction: column;
    border-radius: 14px;
    gap: 10px;
  }

  .header-main h1 {
    font-size: 26px;
    letter-spacing: 2px;
  }

  .header-main p {
    margin-top: 6px;
    font-size: 13px;
  }

  .header-actions {
    width: 100%;
    align-items: flex-start;
  }

  .action-row {
    flex-wrap: wrap;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metric-value span {
    font-size: 28px;
  }

  .panel-title-row h2 {
    font-size: 16px;
    letter-spacing: 1px;
  }

  .chart-host {
    height: 300px;
  }
}
</style>
