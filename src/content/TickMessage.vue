<script setup>

import {onMounted} from "vue"

const Props = defineProps({
    message : String,
    width : Number,
    height: Number
})

var Width = String(Props.width)
var Height = String(Props.height)
var Message = Props.message


function DrawRect() {
  const canvas = document.getElementById("TickTick");
  const ctx = canvas.getContext("2d");
  ctx.font = "16px myFont"
  ctx.fillText(Message, 10, 50);
}
onMounted(()=>{
  DrawRect()
})

</script>
<template>
    <canvas id="TickTick" :width="Width+'px'" :height="Height+'px'"></canvas>
</template>
<style>

#TickTick {
    border-radius: 20px;
    border: 1px solid #aaaaaa;
    position: fixed;
    background-color: white;
    box-shadow: 0 3px 15px #bababa;
    top: 3%;
    right: 3%;
    opacity: 0.8;
}

</style>