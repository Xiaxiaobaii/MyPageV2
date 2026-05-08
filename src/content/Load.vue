<script setup>
import { ref, onMounted } from "vue"
import Tick from './TickMessage.vue'
import { HttpGet ,HttpGetParms } from "../lib/Http"

let IP = location.protocol + "//" + window.location.hostname


var Width = ref(0)
var Height = ref(0)
Width.value = document.documentElement.clientWidth; //实时宽度
Height.value = document.documentElement.clientHeight; //实时高度
addEventListener("resize", () => {
    window.screenWidth = document.documentElement.clientWidth; //实时宽度
    window.screenHeight = document.documentElement.clientHeight; //实时高度
    Width.value = document.documentElement.clientWidth; //实时宽度
    Height.value = document.documentElement.clientHeight; //实时高度
});


onMounted(() => {
    const canvas = document.getElementById("FormBackGround");
    const ctx = canvas.getContext("2d");
    const w = Width.value;
    const h = Height.value;
    const x = w / 2;
    const y = h / 2;
    const radius = 40;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    let r = [4, 4, 4, 4, 4, 4];
    let angle = [10, 25, 45, 65, 90, 120];
    let alpha = [0.25, 0.35, 0.45, 0.65, 0.8, 1];
    let x1 = [], y1 = [];
    setInterval(function () {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#000";
        x1 = [];
        y1 = [];
        for (let i = 0; i < r.length; i++) {
            if (angle[i] >= 360) angle[i] = 0;
            ctx.beginPath();
            ctx.font = "1rem sans-serif";
            ctx.fillStyle = "rgba(50,100,255," + alpha[i] + ")";
            x1.push(x + radius * Math.cos((angle[i] * Math.PI) / 180));
            y1.push(y + radius * Math.sin((angle[i] * Math.PI) / 180));
            ctx.arc(x1[i], y1[i]-60, r[i], 0, 2 * Math.PI, true);
            ctx.closePath();
            ctx.fill();
            angle[i] += 5;
        }
    }, 25);
})

</script>

<template>
  
  <canvas id="FormBackGround" :width="Width" :height="Height" :style="{'background-color': Night==true?'black':'white'}"></canvas>
  <div id="LoadDiv"><p id="LoadText">Loading....</p></div>
  
</template>

<style scoped>

#FormBackGround {
  position: fixed;
  z-index: -10;
  transition: all 2s;
}

#LoadText {
    z-index: 1;
    text-align: center;
    position: fixed;
}

</style>