import axios from "axios"
function Ipget() {
  if (window.location.port == "") {
    return location.protocol + "//" + window.location.hostname
  }else {
    return location.protocol + "//" + window.location.hostname + ":" + window.location.port
  }
}
//var IP = location.protocol + "//" + window.location.hostname
let IP = Ipget()

/**
 * @function 进行无参数GET后端api请求
 * @description
 * 进行无参数GET后端api请求
 * @param gets {string} 请求的子url 
 */
function HttpGet(gets: string, call: Function){
    axios.get(`${IP}/${gets}`).then((json)=>{
        call(json)
    })
}
/**
 * @function 进行有参数GET后端api请求
 * @description
 * 进行有参数GET后端api请求
 * @param gets {string} 请求的子url 
 * @param parms {any} 传入参数
 */
function HttpGetParms(gets: string, parms: Object, call: Function){
    var Gets = axios.get(`${IP}/${gets}`, {
        params: parms
    })
    Gets.then((data)=>{
        call(data)
    })
    
}

function Get(url: string, call: Function) {
    var Gets = axios.get(`${url}`)
    Gets.then((data)=>{
        call(data)
    })
}

function UpdateFile(url: string, call: Function) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", `${IP}/${url}`, true)
    xhr.onreadystatechange = function() {
        console.log(xhr.readyState)
        console.log(xhr.status)
    }
}

function LoadFontTTF(name: string, url: string) {
    let HackTTF = new FontFace(name, 'url('+url+')')
    HackTTF.load().then(font => {
        document.fonts.add(font)
    })
}

export {
    HttpGet,
    HttpGetParms,
    Get,
    LoadFontTTF,
    Ipget
}