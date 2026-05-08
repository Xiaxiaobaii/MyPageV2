
<script setup>
let IP = location.protocol + "//" + window.location.hostname

function loadNormalFont() {
  const HackTTF = new FontFace('HackTTF', 'url('+IP+'/Fils/Hack.woff2)')
  HackTTF.load().then(font => {
    document.fonts.add(font)
  })
  
  const PacificoTTF = new FontFace('PacificoTTF', 'url('+IP+'/Fils/Pacifico.woff2)')
  PacificoTTF.load().then(font => {
    document.fonts.add(font)
  })
}
</script>

<template>
    <router-view></router-view>
</template>