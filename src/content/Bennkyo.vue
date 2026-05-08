<script setup>
import axios from "axios"
import {onMounted, ref} from "vue";
import { useRoute } from "vue-router";
import { marked } from "marked/marked.min.js";
import "../lib/All.css"
import { LoadFontTTF, Ipget } from "../lib/Http"
import { usePageSeo } from "../lib/Seo"
let IP = Ipget()

let LoadSuccess = ref(false)
let Width = ref(document.documentElement.clientWidth)

let route = useRoute();

usePageSeo(
  () => {
    const page = typeof route.params.page === "string" ? route.params.page : ""
    const isList = !page
    const title = isList ? "Xiaxiaobai | Bennkyo" : `Xiaxiaobai | Bennkyo | ${page}`
    const description = isList
      ? "Bennkyo 学习记录页面，包含编程、算法、硬件与生活分类内容。"
      : `Bennkyo 分类 ${page} 的学习与记录内容。`
    const canonicalPath = isList ? "/bennkyo" : `/bennkyo/${encodeURIComponent(page)}`
    return {
      title,
      description,
      keywords: ["Bennkyo", "学习记录", "编程", "算法", "硬件"],
      canonicalPath,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title,
        "url": `${location.protocol}//${location.host}${canonicalPath}`,
      },
    }
  },
  "bennkyo-page"
)

LoadFontTTF("BitcountGridSingle", "Fils/BitcountGridSingle.ttf")

onMounted(()=>{
  addEventListener("resize", () => {
    Width.value = document.documentElement.clientWidth;
  });
  let items = document.getElementsByClassName("drop-item")
  for (let l = 0;l < items.length;l++) {
    let item = items.item(l)
    item.addEventListener("click", (event) => {
      window.location = IP + "/bennkyo/" + item.getAttribute("name")
    })
  }
  let page = route.params.page
  if (page === undefined) {

  }

  axios.get(IP + "/api/blog/blog?id=%E4%BB%8E%E9%9B%B6%E5%BC%80%E5%A7%8B%E7%9A%84Debian%E7%B3%BB%E7%BB%9F%E8%BF%81%E7%A7%BB%E4%B9%8B%E8%B7%AF").then((data) => {
    setTimeout(()=> {
      document.getElementById('textbox').innerHTML = marked.parse(data.data);
    },800)
  })
  
  LoadSuccess.value = true
})

</script>
<template>
  <div id="lowbody">
    <div id="background"></div>
    <div style="height: 3.7rem;position: relative;">
        <div id="top">
            <div></div>
            <div style="font-size: 1.9rem; color: #9b9baa;">Shizhe</div>
            <div> </div>
            <div class="top-con">
              学习<ul class="top-drop">
                <li class="drop-item" name="code">编程这一块</li>
                <li class="drop-item" name="algo">算法与数学</li>
                <li class="drop-item" name="ee">硬件与焊接</li>
              </ul>
            </div>
            <div class="top-con">
              日记<ul class="top-drop">
                <li class="drop-item" name="years">年度总结</li>
                <li class="drop-item" name="month">月报</li>
              </ul>
            </div>
            <div class="top-con">
              生活<ul class="top-drop">
                <li class="drop-item" name="galgame">Galgame</li>
                <li class="drop-item" name="game">游戏</li>
              </ul>
            </div>
            <div class="top-con">
              关于<ul class="top-drop">
                <li class="drop-item" name="myweb">关于本站</li>
                <li class="drop-item" name="my">关于我~</li>
              </ul>
            </div>
            <div></div>
        </div>
    </div>
    <div style="display: flex;flex-direction: row;height: 100%;    position: absolute;
    width: 100%;">
        <div id="aside">
          <ul class="aside-ul">
            <li class="aside-class">JavaSE</li>
            <li class="aside-class">JaveSenior</li>
          </ul>
        </div>
        <div id="main">
            <div id="textbox"></div>
            <div id="list">
              <div>目录</div>
              <hr style="background: #9b9baa;border: unset;height: 1px;"></hr>
              <div id="list-element" style="font-size: 14px;">
                <p>前情提要</p>
                <p>UbuntuLive下载</p>
                <P></P>
              </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
#top {
    padding: .7rem 1.5rem;
    height: 2.2rem;
    display: grid;
    line-height: 2.2rem;
    font-size: 1.3rem;
    color: var(--font-color);
    background-color: rgba(30, 30, 34, 0.8);
    grid-template-columns: 0.3fr 1fr 1.5fr repeat(4, 0.3fr) 0.1fr;
    position: fixed;
    width: 100%;
    z-index: 5;
}

.aside-class {
    font-size: 1.1em;
    font-weight: 700;
    line-height: 1.7;
    color: var(--font-color);
}

.aside-ul {
  padding: 1.5rem 0;
  list-style-type: none;
}

.aside-ul>li:not(:first-child) {
  margin-top: .75rem;
}

.aside-ul>li {
  padding: 0.4rem 1.2rem 0.4rem 1.6rem;
}

.top-con {
    font-size: 16px;
    margin-right: 3rem;
    position: relative;
}

div {
    font-family: 'Georgia';
}

#list-element p {
  margin: 0.5rem 0 0.5rem;
}

#textbox {
    max-width: 860px;
    border-radius: 5px;
    width: inherit;
    min-height: 80%;
    height: max-content;
    background-color: var(--background-color);
    border: 1px solid rgba(30, 30, 34, 1);
    padding: 1rem 2rem 2.5rem;
    margin: 1.3rem 2rem 2.5rem;
}

#list {
    max-width: 200px;
    width: inherit;
    margin-right: 20px;
    height: max-content;
    padding: 10px 15px;
    background-color: var(--background-color);
    border: 1px solid rgba(30, 30, 34, 1);
    position: sticky;
    top: 4.9rem;
    margin-top: 8rem;
}

#aside {
    width: 18rem;
    margin-top: 3.6rem;
    background-color: var(--background-color);
    border-right: 1px solid #30363d;
    position: fixed;
    height: 100%;
}

#main {
    width: 100%;
    position: relative;
    display: flex;
    color: var(--font-color);
    justify-content: center;
    margin-top: 3.6rem;
    margin-left: 20.3rem;
    height: max-content;
}

#background {
    --background-url: url("/Fils/saber.jpg");
    background: var(--background-url) center center / cover no-repeat;
    position: fixed;
}

.todo {
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #ccc;
    border-bottom: 0;
    margin-left: .4rem;
    display: inline-block;
    margin-top: -3px;
    vertical-align: middle;

}

@media (min-width: 0px) {
  .top-con:hover .top-drop {
    display: block !important;
  }
}

.top-drop {
  display: none;
  margin: 0;
  border: 1px solid #30363d;
  border-radius: 3px;
  background-color: var(--background-color);
  padding: 9.6px 0;
  left: -20px;
  position: absolute;
  width: max-content;
}

.drop-item {
  list-style-type: none;
  font-size: 0.9rem;
  margin: 0;
  padding: 0 1rem 0 1.25rem;
}

#lowbody {
    display: flex;
    flex-direction: column;
    height: 100%;
    
    width: 100%;
}


</style>
<style>
:root {
  --background-color: rgba(30, 30, 34, 0.8);
  --font-color: #9b9baa;
}
a {
  color: #bbbbbb !important;
  font-size: 20px;
  text-decoration: underline;
}
*::-webkit-scrollbar {
    width: 0px;
}
</style>
