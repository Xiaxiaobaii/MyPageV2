<script setup>
import { ref, onMounted } from "vue"
import Tick from './TickMessage.vue'
import { HttpGet ,HttpGetParms } from "../lib/Http"
import Cookies from "js-cookie";
import { usePageSeo } from "../lib/Seo"
var LoadSussess = ref(false)

var Night = ref(false)
var Register = ref(false)

let IP = location.protocol + "//" + window.location.hostname

usePageSeo(
  () => ({
    title: "Xiaxiaobai | Login",
    description: "账号登录与注册入口。",
    keywords: ["登录", "注册", "账号", "Xiaxiaobai"],
    canonicalPath: "/login",
    robots: "noindex,nofollow",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "登录",
      "url": `${location.protocol}//${location.host}/login`,
    },
  }),
  "login-page"
)

function CheckRegister(str) {
  if (str == "register" && !Register.value) {
    Register.value = true
  } else if (str == "login" && Register.value) {
    Register.value = false
  }
}

var Width = ref(0)
var Height = ref(0)
Width.value = document.documentElement.clientWidth; //实时宽度
Height.value = document.documentElement.clientHeight; //实时高度
addEventListener("resize", () => {
    window.screenWidth = document.documentElement.clientWidth; //实时宽度
    window.screenHeight = document.documentElement.clientHeight; //实时高度
    Width.value = document.documentElement.clientWidth; //实时宽度
    Height.value = document.documentElement.clientHeight; //实时高度
    setTimeout(() => {
      DrawRect()
    } , 100);
});

function DrawRect() {
  const canvas = document.getElementById("FormBackGround");
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#DCDCDC";
  ctx.strokeRect(0, 0, Width.value, Height.value-1);
  for (let i = Height.value/12;i < Height.value; i += Height.value/12) {
      ctx.strokeRect(0, i, Width.value, Height.value-i);
  }
  for (let i = Width.value/12;i < Width.value; i += Width.value/12) {
      ctx.strokeRect(i, 0, Width.value-i, Height.value);
  }
}

onMounted(() => {
  DrawRect()
  Onlined()
  LoadSussess.value = true
})

let Online = ref(true)

function Onlined() {
  HttpGet("online", (data)=>{
    try {
      if (data.value == "Success") {
        Online = true
      }
    }
    catch(err) {
      Online.value = false
    }
  })
}

function ButtonClick() {
  if (Register.value) {
    Registe(document.getElementById('UserInput').value, document.getElementById('UserPasswd').value)
  }else {
    Login(document.getElementById('UserInput').value, document.getElementById('UserPasswd').value)
  }
}

var Message = ref("登陆失败！")

function Login(userEmail, userPasswd) {
  let Token = ""
  HttpGetParms("api/shiz/idGet", {email: userEmail, passwd: userPasswd}, (data) => {
      if (!Online.value) {
        Message.value = "服务器无法访问！"
        Ticks.value = true
        setTimeout(()=>{Ticks.value = false}, 3000)
        return
      }
      var Json = data.data
      if (Json.code === "200") {
          Message.value = Json.message
          Token = Json.id
          Cookies.set("token", Token)
          Ticks.value = true
          setTimeout(()=>{
            Ticks.value = false
            window.location.href=IP
          }, 3000)
      }else {
          Message.value = Json.message
          Ticks.value = true
          setTimeout(()=>{Ticks.value = false}, 3000)
      }
  })
}

function Registe(userEmail, userPasswd) {
  HttpGetParms("api/shiz/emailRegister", {name: "RANDOM()", passwd: userPasswd, email: userEmail}, (data) => {
      if (!Online.value) {
          Message.value = "服务器无法访问！"
          Ticks.value = true
          setTimeout(()=>{Ticks.value = false}, 3000)
          return
      }
      let Json = data.data
      Message.value = Json.message
      Ticks.value = true
      Cookies.set("token", Json.token)
      setTimeout(()=>{
        Ticks.value = false
        if (Json.code === "200") {

          window.location.href=IP
        }
      }, 3000)
  })
}

var Ticks = ref(false)
</script>

<template>
  
  <canvas id="FormBackGround" :width="Width" :height="Height" :style="{'background-color': Night==true?'black':'white'}"></canvas>
  <div :id="Night===true?'LoginNight':'LoginDay'" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
    <Transition name="tick">
      <Tick v-if="Ticks" :message="Message" :width="330" :height="100" />
    </Transition>
    <Transition>
      <div v-if="LoadSussess">
        <div id="LoginDiv">
          <button @click="CheckRegister('login')" class="Loginl" :id="Register===true?'ChineseLogin':''" style="transition: all 1s;" :style="{color: Night==true?'white':'black', 'font-family': Register==true?'YeZiGongChangBaShuMoJi':'Open-Sans-Condensed'}"> {{ Register == true?'登录':'Login' }}  </button>
          <button @click="CheckRegister('register')" class="Loginl" :id="Register===true?'':'ChineseLogin'" style="transition: all 1s;" :style="{color: Night==true?'white':'black', 'font-family': Register==true?'Open-Sans-Condensed':'YeZiGongChangBaShuMoJi'}"> {{ Register == true?'Register':'注册' }} </button>
          <input id="UserInput" type="text" class="LoginInput" :placeholder="Register===true?'邮箱~':'邮箱~'" />
          <input id="UserPasswd" type="password" class="LoginInput" placeholder="密码~" />
          <button @click="ButtonClick()" class="LoginButton" :style="{color: Night==true?'white':'black'}"> {{ Register === true?'注册':'登录' }} </button>
          <button id="NightMode" @click="Night=!Night" >☪</button>
          <p :style="{color: Night===true?'white':'black'}" style="font-size: 20px;transition: all 1s; text-align: right; margin-right: 10px; user-select: none; margin-top: 15px;">{{ Online?"☑️Online":"⭕Offine" }}</p>
          <p :style="{color: Night===true?'white':'black'}" style="text-align: right; margin-right: 10px; user-select: none; margin-top: -8px;"> Welcome to Shiz </p>
        </div>
        <canvas id="LoginCanvas" width="330px" height="500px"></canvas>
        
      </div>
    </Transition>
  </div>
  
</template>

<style scoped>

.tick-enter-active,
.tick-leave-active {
  transition: all 0.3s ease-in-out;
}

.tick-enter-from,
.tick-leave-to {
  transform: translateX(200px);
  opacity: 0;
}

#FormBackGround {
  position: fixed;
  z-index: -10;
  transition: all 2s;
}

#NightMode {
  position: inherit;
  border: 1px solid;
  border-radius: 100% ;
  block-size: 50%;
  width: 40px;
  font-size: 25px;
  left: 12px;
  bottom: 26px;
  height: 40px;
}

#LoginDay {
  color: rgb(2, 2, 2);
  transition: all 2s;
  z-index: -3;
}

#LoginNight {
  color: rgb(223, 223, 223);
  transition: all 2s;
  z-index: -3;
}

#LoginCanvas {
  z-index: 2;
  border: 1px solid rgb(181, 179, 175);
  border-radius: 20px;
  box-shadow: 0 0 15px;
  transition: all 1s;
}

#LoginDiv {
  width: 330px;
  z-index: 2;
  height: 500px;
  user-select: none;
  position: absolute;
  text-align: center;
  padding-top: 15px;
}

#ChineseLogin {
  font-size: 20px;
}

.Loginl {
  background-color: unset;
  border: unset;
  font-size: 40px;
  display: inline;
  font-family: 'Open-Sans-Condensed', sans-serif;
}

.LoginInput {
  display: block;
  block-size: 40px;
  border-radius: 40px;
  text-indent: 10px;
  font-size: 30px;
  margin: 0 auto;
  margin-top: 50px;
  width: 300px;
}

.LoginInput:hover {
  box-shadow: 0 0 5px;
}

.LoginInput:focus {
  box-shadow: 0 0 5px ;
}

.LoginButton {
  display: block;
  block-size: 50px;
  background-color: unset;
  border: unset;
  user-select: none;
  text-indent: 10px;
  font-size: 30px;
  margin: 0 auto;
  transition: all 1s;
  margin-top: 100px;
  margin-bottom: 10px;
  width: 330px;
}

.LoginButton:hover {
  border-radius: 20px;
  box-shadow: 0 0 30px rgb(97, 96, 96);
}

.v-enter-active,
.v-leave-active {
  transition: all 1.5s ease;
}

.v-enter-from,
.v-leave-to {
  transform: translateX(100px);
  opacity: 0;
}

</style>
