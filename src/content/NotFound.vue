<script setup>
import {onMounted, ref} from "vue";
import "../lib/All.css"
import { HttpGet ,Ipget } from "../lib/Http"
import { usePageSeo } from "../lib/Seo"
let IP = Ipget()
let LoadSuccess = ref(false)
let Width = ref(document.documentElement.clientWidth)

usePageSeo(
  () => ({
    title: "Xiaxiaobai | 404 Not Found",
    description: "页面不存在或链接无效。",
    keywords: ["404", "Not Found", "Xiaxiaobai"],
    canonicalPath: "/404",
    robots: "noindex,nofollow",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "404",
      "url": `${location.protocol}//${location.host}/404`,
    },
  }),
  "notfound-page"
)

onMounted(()=>{
  addEventListener("resize", () => {
    Width.value = document.documentElement.clientWidth;
  });
  LoadSuccess.value = true
})

</script>
<template>
  <div id="body">
    <div style="flex: 2;"></div>
    <div style=" color: antiquewhite; flex: 1; place-items: center; text-align: center;">
        <p style="font-size: 48px;">404</p>
        <p style="font-size: 24px;">Not Found Page</p>
        <p style="font-size: 24px; opacity: 0.7;">其实这里是时空乱流.....huh?</p>
        <a style="border: 1px solid #5c9de4; border-radius: 16px; color: #5c9de4; text-decoration: unset; " href="/" id="rethome">返回主页</a>
    </div>
    <div style="flex: 17;"></div>
  </div>
</template>

<style scoped>
#body {
    background-color: #1b1b1f;
    place-items: center;
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: "JetBrains Mono",ui-monospace,"Menlo","Monaco","Consolas","Liberation Mono","Courier New",monospace;
}

#rethome {
    padding: 3px 16px;
    font-family: "Punctuation SC", "Inter",ui-sans-serif,system-ui,sans-serif,"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
}
</style>
