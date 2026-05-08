import { createRouter, createWebHistory } from 'vue-router'
import { hasManagerToken } from "../lib/managerAuth"

const login = () => import("../content/Login.vue")
const home = () => import("../content/Home.vue")
const document = () => import("../content/XiaobaiDocument.vue")
const blog = () => import("../content/Blog.vue")
const about = () => import("../content/About.vue")
const links = () => import("../content/Links.vue")
const xiaria = () => import("../content/Xiaria.vue")
const Bennkyo = () => import("../content/Bennkyo.vue")
const manage = () => import("../content/Manager.vue")
const blogUpdate = () => import("../content/BlogUpdate.vue")
const Yura = () => import("../content/Yura/yura.vue")
const tool = () => import("../content/tool.vue")
const readmeShow = () => import("../content/readme_show.vue")
const NotFound = () => import("../content/NotFound.vue")

const routes = [
  { path: '/', component: home, alias: '/home' },
  { path: '/login', component: login },
  { path: '/document', component: document },
  { path: '/blog', component: blog },
  { path: '/blog/update', component: blogUpdate },
  { path: '/blog/:page', component: blog },
  { path: '/about', component: about },
  { path: '/links', component: links, alias: '/link' },
  { path: '/aria', component: xiaria },
  {
    path: '/manage/login',
    component: manage,
    beforeEnter: () => (hasManagerToken() ? '/manage' : true),
  },
  {
    path: '/manage',
    component: manage,
    beforeEnter: () => (hasManagerToken() ? true : '/manage/login'),
  },
  { path: '/yura', component: Yura},
  { path: '/tool', component: tool, alias: '/tools' },
  { path: '/tools/:page', component: readmeShow },
  { path: '/bennkyo', component: Bennkyo },
  { path: '/bennkyo/:page', component: Bennkyo },
  { path: "/404", name: "NotFound", component: NotFound },
  { path: "/:pathMatch(.*)*", redirect: "/404" },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
