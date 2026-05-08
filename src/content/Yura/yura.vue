<script setup>
import { effects, noise, Kampos, transitions } from "kampos";
import {onMounted, ref, onBeforeMount} from "vue";
import { Howl } from "howler";

let IP = location.protocol + "//" + window.location.host
let Width = ref(document.documentElement.clientWidth)
let LoadBackgroundUrl1 = IP + "/Fils/yura/load.webp"
let LoadBackgroundUrl = IP + "/Fils/yura/load2.webp"
let MainBackgroundUrl = IP + "/Fils/yura/background.webp"
let WhiteBackgroundUrl = IP + "/Fils/yura/white.png"
let State = ref(null)


const HtmlState = {
  Load1: "load1",
  Load2: "load2",
  Main: "main",
};


class Snowflakes {
  x = 0;
  y = 0;
  radius = 0;
  vy = 0;
  vx = 0;
  alpha = 0;
  constructor(once) {
    this.init(once)
  }

  init(once) {
    this.x = Math.random() * 1920;
    this.radius = 1 + Math.random() * 5;
    this.vx = 0.5 - Math.random();
    this.vy = 0.7 + Math.random() * 0.7;
    this.alpha = 0.3 + Math.random() * 0.7;
    if (once) {
      this.y = Math.random() * 1080;
    }else {
      this.y = Math.random() * -100;
    }

  }

  update() {
    if (this.x > 1920 || this.y > 1080) {
      this.init(false)
    }
    this.x += this.vx;
    this.y += this.vy;
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, Math.PI * 2, false);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

const TrainOne = new FontFace('TrainOne', 'url('+IP+'/Fils/yura/TrainOne.ttf)')
TrainOne.load().then(font => {
  document.fonts.add(font)
})

const Shizuru = new FontFace('Shizuru', 'url('+IP+'/Fils/yura/Shizuru.ttf)')
Shizuru.load().then(font => {
  document.fonts.add(font)
})


let canvas_snow = null;
let ctx = null;
let flakes = new Array();

function snow() {
  for (let i = 0; i< 500; i++) {
    let snowp = new Snowflakes(true);
    snowp.update();
    flakes.push(snowp)
  }
}

function updateFrame() {
  ctx.clearRect(0, 0, canvas_snow.width, canvas_snow.height);
  flakes.forEach(element => {
    element.update();
  });
  requestAnimationFrame(() => updateFrame());
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = function () {
      resolve(this);
    };
    img.src = src;
  });
}
const dissolve = transitions.dissolve();
const promisedImages = [
  loadImage(LoadBackgroundUrl),
  loadImage(WhiteBackgroundUrl)
];
const WIDTH = 1920;
const HEIGHT = 1080;
const CELL_FACTOR = 8;
  var sound = new Howl({
    src: ["Fils/yura/music.mp3"]
  })

onBeforeMount(() => {
  document.title = "こうづき ゆら web site"
  State.value = HtmlState.Load1
})

let target = null;
let hippo = null;
let time = 1;

onMounted(()=>{
  State.value = HtmlState.Main
  canvas_snow = document.querySelector('#snow');
  canvas_snow.width = WIDTH;
  canvas_snow.height = HEIGHT;
  ctx = canvas_snow.getContext('2d');
  loadImage(MainBackgroundUrl);
  target = document.querySelector('#target')
  const turbulence = effects.turbulence({ noise: noise.perlinNoise })
  const AMPLITUDE = CELL_FACTOR / WIDTH;
  turbulence.frequency = {x: AMPLITUDE, y: AMPLITUDE};
  turbulence.octaves = 1;
  turbulence.isFractal = true;
  turbulence.octaves = 8;
  const mapTarget = document.createElement('canvas');
  mapTarget.width = WIDTH;
  mapTarget.height = HEIGHT;

  const dissolveMap = new Kampos({
    target: mapTarget,
    effects: [turbulence],
    noSource: true
  });
  dissolveMap.draw();
  dissolve.map = mapTarget;
  dissolve.high = 0.03;
  hippo = new Kampos({target, effects: [dissolve]});

  addEventListener("resize", () => {
      Width.value = document.documentElement.clientWidth;
  });
  sound.play();
  snow();
  updateFrame();
  Promise.all(promisedImages).then(([fromImage, toImage]) => {
    hippo.setSource({media: fromImage, WIDTH, HEIGHT});
    dissolve.to = toImage;
    hippo.play(() => {
      if (time == 58) {
        target.style.opacity = 0;
        hippo.stop()
        // hippo.destroy()
        return
      }
      let progress = Math.abs(Math.PI*time / 180 % 1)
      dissolve.progress = progress;
      time += 1
    });
  });
})
</script>

<template>
  <div class="ground">
    <canvas id="snow" class="targets"></canvas>
    <canvas id="target" class="targets"></canvas>
    <!-- <div class="ground" v-if="State != HtmlState.Main">
      <div class="background" :class="{ Loadscale: State==HtmlState.Load2 }" :style="{'background-image': 'url('+LoadBackgroundUrl1+')'}"></div>
      <Transition name="white">
      <div class="background load2" :style="{'background-image': 'url('+LoadBackgroundUrl+')'}" v-show="State == HtmlState.Load2"></div>
      </Transition>
    </div> -->
    <div id="main" class="background" v-show="State == HtmlState.Main" :style="{'background-image': 'url('+MainBackgroundUrl+')'}">
      <div id="content">
        <div id="title">こうづき ゆら</div>
        <div id="overcontent">
          <div id="side">
            <div class="side_text">由良の記</div>
            <div class="side_text">由良の愛</div>
            <div class="side_text">由良の相</div>
          </div>
          <div id="main_text">由良</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.white-leave-active,
.white-enter-active {
  transition: opacity 4s ease;
}

.white-leave-to,
.white-enter-from {
  opacity: 0;
}

.Loadscale {
  scale: 1.5;
  opacity: 0;
  transition: all 2.5s ease;
  padding-left: 1300px;
}

.ground {
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-select: none;
}

.load2 {
  z-index: 5;
}

#side {
  height: 100%;
  float: left;
  display: flex;
  flex-direction: column;
  width: 1%;
  overflow: visible;
  font-family: "TrainOne", sans-serif;
  word-break: keep-all;
}

.side_text {
  position: relative;
  right: 60px;
  margin-top: 20px;
  margin-bottom: 50px;
  font-size: 46px;
  transform: rotate(30deg);
}

#main_text {
  height: 100%;
  width: inherit;
  opacity: 0.7;
  padding: 5%;
  padding-left: 8%;
}

.targets {
  z-index: 100;
  transition: opacity 2s ease;
  position: fixed;
}

#title {
  width: 100%;
  font-family: "Shizuru", sans-serif;
  height: 10%;
  font-size: 60px;
  color: white;
  opacity: 0.8;
  margin-left: 2%;
}

#overcontent {
  height: inherit;
  background-color: rgb(221, 221, 221);
  opacity: 0.3;
  border-radius: 4px;
}

#content {
  margin-top: 1.2%;
  margin-left: 5%;
  width: 75%;
  height: 88%;
  position: absolute;
  z-index: 10;
}

#main {
  width: 100%;
  height: 100%;
  z-index: 1;
  background-size: cover;
  background-position: center center;
  position: fixed;
}

.background {
    width: 100%;
    height: 100%;
    z-index: 2;
    display: block;
    margin: 0;
    position: fixed;
    background-size: auto;
    background-repeat: no-repeat;
}

</style>