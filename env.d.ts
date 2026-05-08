/// <reference types="vite/client" />

declare module '*.vue' {
    import { ComponentOptions } from 'vue'
    const componentOptions: ComponentOptions
    export default componentOptions
  }

declare module 'marked/marked.min.js' {
  export * from 'marked'
}
  
