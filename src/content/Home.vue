<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Ipget, HttpGetParms } from "../lib/Http"
import { Get } from "../lib/Http"
import { usePageSeo } from "../lib/Seo"
// let IP = location.protocol + "//" + window.location.hostname
let BackgroundUrl = "/api/wallpaper?t=" + Date.now()
let text = ref("")
let imgId = ""
let LoadSuccess = ref(false)
let Width = ref(0)
let CanNoAside = false
let AsideUsing = ref(false)
let menuUrl = "/static/menu.png"


function getViewportWidth() {
    if (window.visualViewport && Number.isFinite(window.visualViewport.width)) {
        return Math.round(window.visualViewport.width)
    }
    return document.documentElement.clientWidth
}

function handleResize() {
    Width.value = getViewportWidth()
}

const PacificoTTF = new FontFace('Chillax-Variable', 'url("/static/Chillax-Variable.woff2")')
PacificoTTF.load().then(font => {
    document.fonts.add(font)
})
onMounted(async () => {
    handleResize()
    addEventListener("resize", handleResize, { passive: true });
    document.addEventListener('keyup', keyboard);

    // let flag = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)
    // if (!flag) {
    //     BackgroundUrl = IP + "/api/wallpaper?t=" + Date.now()
    // }
    const img = document.getElementById("background");
    img.src = BackgroundUrl;
    img.onload = () => {
        console.log("LoadSu");
        textupdate()
        LoadSuccess.value = true
    }

})

onBeforeUnmount(() => {
    removeEventListener("resize", handleResize);
    document.removeEventListener('keyup', keyboard);
})

function keyboard(eve) {
    if (eve.key == "p") {
        HttpGetParms("api/badImg", { id: imgId }, (data) => {
        })
    }
}

async function textupdate() {
    await new Promise(re => {
        setTimeout(async () => {
            Get("/api/oncetalk", async (data) => {
                if (data.status == 200) {
                    await textg(data.data);
                } else {
                    await textg("我们的世界");
                }
            })
            re()
        }, 1000)
    });
}

async function textg(tex) {
    for (let i = 0; i < tex.length; i += 1) {
        await new Promise(resolve => {
            setTimeout(() => {
                text.value += tex.split("")[i];
                resolve()
            }, 150)
        });
    }
    await new Promise(re => {
        setTimeout(() => re(), 3000)
    })
    let textl = text.value.length
    for (let i = 0; i < textl; i += 1) {
        await new Promise(resolve => {
            setTimeout(() => {
                text.value = text.value.slice(0, -1)
                resolve()
            }, 140)
        });
    }
    setTimeout(textupdate, 1000)
}

function NoAside() {
    if (AsideUsing.value && CanNoAside) { AsideUsing.value = !AsideUsing.value; CanNoAside = !CanNoAside }
}

function UsAside() {
    AsideUsing.value = !AsideUsing.value;
    setTimeout(() => { CanNoAside = !CanNoAside }, 100)
}
</script>

<template>
    <Transition name="loadtime">
        <div v-if="!LoadSuccess"
            style="height: 100%;width: 100%;background-color: #ffffff;display: flex;justify-content: center;align-items: center;flex-direction: column;position: fixed;">
            <div style="">Loading.</div>
            <div style="width: 100%;margin-top: 1%;">
                <hr class="loadhr" style="float: left;">
                </hr>
                <hr class="loadhr" style="float: right">
                </hr>
            </div>
        </div>
    </Transition>

    <div @click="NoAside" v-show="LoadSuccess">
        <img id="background" alt="Background"></img>
        <div class="textm" :id="Width < 1000 ? 'textmain_phone' : 'textmain'">
            <p class="textf" style="bottom: 100px; padding-right: 30px;">『</p>
            <div class="textm" :class="Width < 1000 ? 'textm_phone' : ''">
                <span :class="Width >= 1000 ? 'text' : 'text_phone'">{{ text }}&thinsp;</span>
                <span :class="Width >= 1000 ? 'text' : 'text_phone'" id="noap"
                    style="padding-left: 0;padding-right: 0;display: inline;">_</span>
            </div>
            <p class="textf">』</p>
        </div>
        <header id="navheader">
            <nav class="navs" v-if="Width >= 1000">
                <span id="title">Xiaxiaobai</span>
                <ol
                    style="list-style-type: none; justify-content: flex-end; display: flex; justify-content: flex-end; width: 100%;user-select: none;">
                    <li class="navtext"><a class="basica" href="/blog">Blog</a></li>
                    <li class="navtext"><a class="basica" href="/document">Document</a></li>
                    <li class="navtext"><a class="basica" href="/aria">Micro Aria</a></li>
                    <li class="navtext"><a class="basica" href="/links">Links</a></li>
                    <li class="navtext"><a class="basica" href="/tools">Tools</a></li>
                </ol>
            </nav>
            <nav class="navs" v-else>
                <img :src="menuUrl" @click="UsAside" id="optionI" alt="option"></img>
                <span id="title">Xiaxiaobai</span>
            </nav>
        </header>
        <Transition name="aside">

            <aside id="aside" v-if="AsideUsing">
                <li id="AsideTitle">
                    <h1>Xiaxiaobai</h1>
                </li>
                <li style="    display: block;"><a class="AsideSpan" href="/blog">Blog</a></li>
                <li style="    display: block;"><a class="AsideSpan" href="/document">Document</a></li>
                <li style="    display: block;"><a class="AsideSpan" href="/aria">Micro Aria</a></li>
                <li style="    display: block;"><a class="AsideSpan" href="/links">Links</a></li>
                <li style="    display: block;"><a class="AsideSpan" href="/tools">Tools</a></li>
            </aside>
        </Transition>
    </div>
</template>

<style scoped>
#ad {
    position: fixed;
    z-index: 100;
    transition: transform 10s;
    left: 60px;
    top: 500px;
    animation: adan 20s;
}

.basica {
    color: #fff;
    text-decoration: none;
}

@keyframes adan {
    from {
        transform: translate(0, 0);
    }

    50% {
        transform: translate(700px, -500px);
    }

    to {
        transform: translate(900px, 300px);
    }
}

.aside-enter-active,
.aside-leave-active {
    transition: all 0.3s ease;
}

.aside-enter-from,
.aside-leave-to {
    transform: translateX(-140px);
    opacity: 0;
}

/* 
.donate-enter-active,
.donate-leave-active {
  transition: all 1s ease;
}

.donate-enter-from,
.donate-leave-to {
    transform: translateX(-200px);
    opacity: 0;
} */

.loadtime-leave-active {
    transition: opacity 1s;
}

.loadtime-leave-to {
    opacity: 0;
}

.loadhr {
    animation: hrload 2s;
    width: calc(50% - 2px);
    display: inline;
    margin: 0;
}

@keyframes hrload {
    from {
        width: 0%;
    }

    to {
        width: calc(50% - 2px);
    }
}

#optionI {
    height: 34px;
    margin-left: 18px;
    margin-top: 10px;
    width: auto;
}

#AsideTitle {
    padding: 30px 10px calc(32px + var(--font-descender-fix, 2px));
    border-bottom: 1px solid rgba(60, 60, 60, .29);
    line-height: 1.3;
    display: block;
    overflow: visible;
}

.AsideSpan {
    padding-top: 10px;
    text-decoration: none;
    font-family: 'Chillax-Variable', monospace;
    display: block;
    font-size: 25px;
    position: relative;
    padding: 30px 20px;
    border-bottom: 1px solid rgba(60, 60, 60, .29);
    box-sizing: border-box;
    color: #000;
}

#aside {
    flex-direction: column;
    height: 100dvh;
    padding: 0 20px;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    font-family: 'Chillax-Variable', monospace;
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

#background {
    width: 100%;
    height: 100%;
    min-height: 100dvh;
    z-index: -1;
    display: block;
    margin: 0;
    position: fixed;
    filter: brightness(0.6);
    object-fit: cover;
}

#navheader {
    display: flex;
    margin: 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: env(safe-area-inset-top) 0 0 0;
    overflow: visible;
    --font-descender-fix: 2px;
}

.navs {
    width: 100%;
    margin-right: 60px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    overflow: visible;
    min-height: 60px;
}

#title {
    font-size: 24px;
    cursor: default;
    padding: 10px 24px calc(12px + var(--font-descender-fix));
    user-select: none;
    letter-spacing: 2px;
    font-family: 'Chillax-Variable', monospace;
    color: white;
    display: inline-flex;
    align-items: center;
    line-height: normal;
    overflow: visible;
}

.navtext {
    cursor: default;
    padding: 0 18px calc(2px + var(--font-descender-fix));
    text-decoration: none;
    font-family: 'Chillax-Variable', monospace;
    opacity: 0.85;
    color: white !important;
    display: inline-flex;
    align-items: center;
    line-height: normal;
    overflow: visible;
}

.textm {
    font-size: 2.52rem;
    text-align: center;
    line-height: 1.2;
    width: 70%;
    color: white;
    user-select: none;
    margin: auto;
    vertical-align: middle;
}

.textm_phone {
    line-height: 0.8;
}

#textmain {
    display: flex;
    justify-content: center;
}

#textmain_phone {
    width: 100%;
    display: flex;
    justify-content: center;
}

.textf {
    margin-bottom: 36vh;
    display: inline;
    margin-top: 46vh;
    position: relative;
}

.text {
    word-break: break-all;
}

.text_phone {
    word-break: break-all;
    font-size: 1.5rem;
}

#noap {
    animation: noapanimation 0.7s infinite;
}

@keyframes noapanimation {
    50% {
        opacity: 0.0;
    }
}

@media (max-width: 1000px) {
    .navs {
        margin-right: 0;
    }

    #title {
        padding: 10px 14px;
    }

    #aside {
        width: min(78%, 380px);
    }
}
</style>
