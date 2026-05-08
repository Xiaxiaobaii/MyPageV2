<script setup>
import { onMounted, ref } from 'vue';
import { HttpGet ,HttpGetParms } from "../lib/Http"
import { marked } from "marked/marked.min.js";
import "../lib/All.css";
import {useRoute} from "vue-router";
import { usePageSeo } from "../lib/Seo"
const route = useRoute()
let Page = route.query.page;
let IP = location.protocol + "//" + window.location.hostname
let Width = ref(0)
Width.value = document.documentElement.clientWidth;

usePageSeo(
  () => {
    const docPage = typeof route.query.page === "string" ? route.query.page : ""
    const title = docPage ? `Xiaxiaobai | Document | ${docPage}` : "Xiaxiaobai | Document"
    const description = docPage
      ? `文档页面：${docPage}。`
      : "夏小白文档中心，包含分组目录与技术文档内容。"
    const canonicalPath = docPage ? `/document?page=${encodeURIComponent(docPage)}` : "/document"
    return {
      title,
      description,
      keywords: ["文档", "Xiaobai Document", "技术文档", "教程"],
      canonicalPath,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "name": title,
        "url": `${location.protocol}//${location.host}${canonicalPath}`,
        "description": description,
      },
    }
  },
  "document-page"
)


let AsideJson = ref([])
let LikeJson = ref("")
let LoadSuccess = ref(false)
let MainLoad = ref(true)
let UsAside = ref(false)
let CanNoAside = false

onMounted(() => {
  if (Page !== undefined) {
    HttpGet("api/document?doc="+Page, (data) => {
      LikeJson = data.data
      document.getElementById('Main').innerHTML = marked.parse(LikeJson);
    })

  }else {
    switchDocs("序", "主页")
    // HttpGet("api/document?doc=序-主页", (data) => {
    //   LikeJson = data.data
    //   document.getElementById('Main').innerHTML = marked.parse(LikeJson);
    // })
  }
    AsideJson.value = [["序", "主页", "介绍"]]
    HttpGet("api/document", (data) => {
        AsideJson = data.data
    })

    addEventListener("resize", () => {
        Width.value = document.documentElement.clientWidth;
    });
    setTimeout(() => {
        LoadSuccess.value = true
    }, 500)
})

function switchDocs(docs, doc) {
    MainLoad.value = false
    HttpGet("api/document?doc="+ docs + "-" + doc, (data) => {0
        setTimeout(()=>{
          LikeJson = data.data
          document.getElementById('Main').innerHTML =
          marked.parse(LikeJson);
          MainLoad.value = true
        },700)
    })
}

function NoAside() {
    if (UsAside.value && CanNoAside) { UsAside.value = !UsAside.value;CanNoAside = !CanNoAside }
}

function UsingAside() {
    UsAside.value = !UsAside.value;
    setTimeout(()=>{ CanNoAside = !CanNoAside },100)
}

function ReturnMain() {
    window.location.href=IP
}
</script>

<template>
    
        <div class="All" @click="NoAside">
            <Transition name="header">
            <header id="Header" v-if="LoadSuccess">
                <nav class="navs" v-show="Width < 1000 && LoadSuccess">
                    <img :src="IP + '/Fils/menu.png'" @click="UsingAside" id="optionI" alt="option"></img>
                </nav>
                <span id="title" @click="ReturnMain" >XiaoBai Document</span>
            </header>
            </Transition>
            <div id="Nheader">
                <Transition name="aside">
                    <aside class="Aside" style="margin-right: 30px;" v-show="Width >= 1000 && LoadSuccess">
                        <a id="AsideTitle" :href="IP"><h1 class="TrColor" style="user-select: none; cursor: unset !important;">夏小白</h1></a>
                        <div class="AsideGroup" v-for="(item, index) in AsideJson" :key="index">
                            <span class="AsideSpan">{{ item[0] }}</span>
                            <div v-for="ite in item.slice(1)" :key="ite" class="AsideIte">
                                <a class="AsideP TrColor" @click="switchDocs(item[0], ite)">{{ ite }}</a>
                            </div>
                        </div>
                    </aside>
                </Transition>
                <Transition name="Moaside">
                    <aside class="MoAside" style="margin-right: 30px;" v-if="UsAside && LoadSuccess">
                        <h1 id="AsideTitle">夏小白</h1>
                        <div class="AsideGroup" v-for="(item, index) in AsideJson" :key="index">
                            <span class="AsideSpan">{{ item[0] }}</span>
                            <div v-for="ite in item.slice(1)" :key="ite" class="AsideIte">
                                <a class="AsideP" @click="switchDocs(item[0], ite)">{{ ite }}</a>
                            </div>
                        </div>
                    </aside>
                </Transition>
                <Transition name="main">
                    <div id="Main" v-show="LoadSuccess && MainLoad">
                    </div>
                </Transition>

            </div>
        </div>


</template>

<style scoped>

.main-enter-active,
.main-leave-active {
  transition: all 1.5s ease;
}

.main-enter-from,
.main-leave-to {
  transform: translateX(-200px);
  opacity: 0;
}

.header-enter-active,
.header-leave-active {
  transition: all 1.5s ease;
}

.Moaside-enter-active,
.Moaside-leave-active {
  transition: all 0.3s ease;
}

.Moaside-enter-from,
.Moaside-leave-to {
  transform: translateX(-140px);
  opacity: 0;
}

.header-enter-from,
.header-leave-to {
  transform: translateX(200px);
  opacity: 0;
}

.aside-enter-active {
  transition: all 1s ease-out;
}

.aside-enter-from {
  transform: translateY(200px);
  opacity: 0;
}

.All{
    height: 100%;
    width: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
}

.AsideIte {
    margin: 15px 0;
}

#optionI {
    height: 34px;
    margin-left: 18px;
    margin-top: 16px;
    filter: invert(100%)
}

#AsideTitle {
  padding: 10px 10px 5px;
  color: unset;
  cursor: unset !important;
  text-decoration: unset;
  border-bottom: 1px solid rgba(60, 60, 60, .29);
}

#AsideDiv {
    height: 100%;
    display: flex;
    width: 100%;
}

.AsideGroup {
    position: relative;
    padding: 10px 20px;
    border-bottom: 1px solid rgba(60, 60, 60, .29);
    box-sizing: border-box;
}

.AsideSpan {
    padding-top: 10px;
    font-size: 25px;
}

.AsideP {
    margin: 15px 0;
    padding-left: 10px;
}

#Nheader {
    display: flex;
    width: 100%;
    height: 100%;
}
#Header {
    user-select: none;
    display: flex;
    margin: 0;
    position: relative;
    top: 0;
    width: 100%;
    line-height: 46px;
    height: 7%;
    padding: 0;
    border: 3px solid rgb(255, 255, 255);
    box-shadow: 0 5px 20px #7e7d7d;
}

#Main {
    height: 88%;
    padding-top: 2%;
    width: 82%;
    margin-left: 5%;
    user-select: none;
    margin-right: 10%;
    right: 0;
    overflow-x: hidden;
    position: relative;
}

#Main::-webkit-scrollbar {
    width: 2px;
}

.MoAside {
    flex-direction: column;
    height: 100%;
    padding: 0 20px;
    
    left: 0;
    top: 0;
    display: flex;
    overflow-x: hidden;
    width: 65%;
    position: fixed;
    box-shadow: 0px 20px 20px #000000;
    z-index: 999;
    background-color: #fff;
}

.Aside {
    flex-direction: column;
    user-select: none;
    height: 90%;
    padding: 0 20px;
    left: 0;
    display: flex;
    overflow-x: hidden;
    width: 18%;
    position: relative;
    box-shadow: 0px 20px 20px #646464;
}

.Aside::-webkit-scrollbar {
    width: 2px;
}

#title {
    margin-left: 25px;
    font-size: 20px;
    cursor: default;
    user-select: none;
    letter-spacing: 2px;
    color: #000;
    padding: 10px 24px 0 4px;
}
</style>

<style>
pre {
    width: 80%;
    border: 2px solid #383838;
    border-radius: 24px;
    background-color: #383434;
    color: #fff;
    padding: 20px;
    user-select: text;
    font-size: 14px;
    overflow-y: hidden;
}

img {
    width: 60%;
    height: 60%;
}

*::-webkit-scrollbar {
    width: 2px;
}


</style>
