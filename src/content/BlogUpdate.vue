<script setup>
import { onMounted, ref } from "vue";
import "../lib/All.css"
import { usePageSeo } from "../lib/Seo"
let IP = location.protocol + "//" + window.location.hostname
let LoadSuccess = ref(false)
let Width = ref(document.documentElement.clientWidth)

onMounted(() => {
    addEventListener("resize", () => {
        Width.value = document.documentElement.clientWidth;
    });
    LoadSuccess.value = true
})

let mode = ref("Blog") // Blog or Learn

usePageSeo(
    () => ({
        title: "Xiaxiaobai | Blog Submit",
        description: "站内文章投稿与文本提交页面。",
        keywords: ["投稿", "文章发布", "Xiaxiaobai"],
        canonicalPath: "/blog/update",
        robots: "noindex,nofollow",
        jsonLd: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "文章投稿",
            "url": `${location.protocol}//${location.host}/blog/update`,
        },
    }),
    "blog-update-page"
)



function Upload() {
    let input = document.getElementById("update")
    let name = document.getElementById("name")
    let author = document.getElementById("author")
    let password = document.getElementById("password")
    let fils = input.files;
    if (fils.length === 0) {
        alert("还未选择文件哦!")
        return
    } else if (name.value === "" || author.value === "") {
        alert("还未填写作者名称或文章名称哦!")
        return
    } else if (password.value == "") {
        alert("未填写提交密码")
        return
    }

    let formData = new FormData();
    if (mode.value == "Blog") {
        let ArrayTag = document.getElementsByClassName("tags")
        let Elements = Array.prototype.filter.call(
            ArrayTag,
            function (testElement) {
                if (testElement.nodeName === "INPUT" && testElement.value !== "") {
                    return true;
                } else {
                    return false;
                }

            },
        );

        let Tags = []
        for (let i = 0; i < Elements.length; i++) {
            Tags[i] = Elements[i].value
        }
        formData.append("file", input.files[0]);
        formData.append("bookName", name.value);
        formData.append("author", author.value);
        formData.append("auth", password.value)
        formData.append("type", "Blog")
        formData.append("tags", Tags);
    } else {
        let textname = document.getElementById("textname")
        formData.append("file", input.files[0]);
        formData.append("area", name.value);
        formData.append("type", "Text")
        formData.append("class", author.value);
        formData.append("textname", textname.value);
    }

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let tou = document.getElementById("tou")
            tou.innerHTML = "投稿成功!"
            setTimeout(() => {
                let tou = document.getElementById("tou")
                tou.innerHTML = "还要继续投稿吗?"
            }, 4000)
        }
        if (xhr.status === 404) {
            let Data = JSON.parse(xhr.responseText);
            let tou = document.getElementById("tou")
            tou.innerHTML = "投稿失败! 原因: " + Data.message
            setTimeout(() => {
                let tou = document.getElementById("tou")
                tou.innerHTML = "还要继续尝试投稿吗?"
            }, 4000)
        }
    };
    xhr.open("POST", IP + "/api/upload_blog");
    xhr.send(formData);

}

function AddTag() {
    let div = document.querySelector(".normtag").cloneNode(false)
    const iframeContainer = document.getElementById("tags");
    iframeContainer.appendChild(div)
}

function Restatu() {
    console.log(mode)
    if (mode.value == "Blog") {
        mode.value = "Mid"
        setTimeout(() => { mode.value = "Post" }, 600);
    } else {
        mode.value = "Blog"
    }

}
</script>
<template>
    <div style="height: 100%;width: 100%;display: flex;align-items: center;">
        <Transition name='blog'>
            <div id="main" v-if="mode == 'Blog'">
                <div class="head">投稿</div>
                <div>
                    <p class="margin">文章名称?</p>
                    <input class="inputs" id="name">
                </div>
                <div>
                    <p class="margin">文章作者?</p>
                    <input class="inputs" id="author">
                </div>
                <div>
                    <p class="margin">文章密码?(非必要可不设)</p>
                    <input class="inputs" id="password">
                </div>

                <label id="uplabel">
                    <div style="
                width: auto;
                height: 100%;
                display: flex;
                justify-content: space-around;
                align-items: center;
                position: relative;
                user-select: none;">
                        <p>上传文章?</p>
                    </div>
                    <input type="file" id="update">
                </label>
                <div @click="Restatu()" class="arrow"></div>
                <div id="tags" style="display:flex;margin: 20px;margin-left: 0;">
                    <button @click="AddTag()" class="tags">添加</button>
                    <input class="tags normtag">
                </div>
                <p id="tou" @click="Upload()" style="
                font-size: 20px;
                color: #3f2828;
                user-select: none;
                padding-left: 5px;
            ">点我投稿~</p>
                <p class="margin">ps: 投稿使用重复名字可以更新投稿哦~</p>
            </div>
        </Transition>




        <div id="main-post" class="post" v-show="mode == 'Post'">
            <div class="head">提交</div>
            <div>
                <p class="margin">文章分区?</p>
                <input class="inputs" id="name">
            </div>
            <div>
                <p class="margin">文章小类?</p>
                <input class="inputs" id="author">
            </div>
            <div>
                <p class="margin">文章名?</p>
                <input class="inputs" id="textname">
            </div>

            <label id="uplabel">
                <div style="
            width: auto;
            height: 100%;
            display: flex;
            justify-content: space-around;
            align-items: center;
            position: relative;
            user-select: none;">
                    <p>上传文章?</p>
                </div>
                <input type="file" id="update">
            </label>
            <div @click="Restatu()" class="arrow"></div>
            <p id="tou" @click="Upload()" style="
            font-size: 20px;
            color: #3f2828;
            user-select: none;
            padding-left: 5px;
        ">点我提交</p>
        </div>
    </div>
</template>

<style scoped>
.blog-leave-active {
    transition: opacity 0.5s;
}

.blog-leave-to {
    opacity: 0;
}


#main {
    border: 1px solid #000;
    box-shadow: 0 0 10px #b09b9b;
    height: 80%;
    width: 60%;
    padding: 30px;
    padding-left: 6%;
    border-radius: 10px;
    margin-left: 40px;
}

#main-post {
    border: 1px solid #000;
    box-shadow: 0 0 10px #b09b9b;
    height: 80%;
    width: 60%;
    padding: 30px;
    padding-left: 6%;
    border-radius: 10px;
    margin-left: 40px;
}

#show {
    width: 40%;
}

.head {
    text-shadow: 10px 0 12px #b09b9b;
    font-size: 35px;
    letter-spacing: 5px;
}

.margin {
    color: #6b6b6b;
    font-size: 12px;
    margin: unset;
    margin-top: 20px;
}

.post {
    animation-duration: 1.5s;
    animation-name: hacking;
    animation-timing-function: ease;
}

.arrow {
    position: absolute;
    right: 35%;
    bottom: 50%;
    border: 1px solid #a9a9a9;
    padding: 18px;
    border-bottom: 0;
    background-color: #ffffff;
    user-select: none;
    border-left: 0;
    transform: rotate(45deg);
}

.inputs {
    margin-top: 4px;
    padding-bottom: 3px;
    width: 50%;
    height: auto;
    border: unset;
    border-bottom: 2px solid #6b6b6b;
}

.inputs:focus-visible {
    outline: unset !important;
}

#uplabel {
    margin-top: 14px;
    display: block;
    border: 1px solid #6b6b6b;
    height: 30%;
    width: 50%;
    border-radius: 10px;
    text-align: center;
}

#update {
    opacity: 0;
    height: 0;
    width: 0;
}

.tags {
    width: 50px;
    height: 25px;
    font-size: 14px;
    border-radius: 20px;
    margin-right: 10px;
    color: #555555;
    background-color: #e6e6e6;
    border: unset;
    overflow: hidden;
    cursor: pointer;
    padding: unset;
    outline: unset;
}

.normtag {
    width: 42px;
    padding-left: 8px;
}

@keyframes hacking {
    from {
        transform: rotate(45deg);
        margin-left: -500px;
        margin-top: -500px;
    }

    40% {
        transform: rotate(45deg);
        margin-left: 400px;
        margin-top: 700px;
        opacity: 0.7;
    }

    60% {
        transform: rotate(45deg);
        margin-left: 400px;
        margin-top: 700px;
        opacity: 0;
    }

    61% {
        margin-left: 40px;
        transform: rotate(0deg);
    }

    65% {
        margin-left: 40px;
        transform: rotate(0deg);
        opacity: 0;
    }

    66% {

        opacity: 1;
    }

    to {
        margin-left: 40px;
    }
}
</style>
