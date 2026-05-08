import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const APP_SSR_HTML_KEY = "__APP_SSR_HTML__"

function captureInitialAppHtml() {
  const appRoot = document.getElementById("app")
  const html = appRoot?.innerHTML || ""
  ;(window as any)[APP_SSR_HTML_KEY] = html
}

function mountApp() {
  captureInitialAppHtml()
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}
mountApp()
