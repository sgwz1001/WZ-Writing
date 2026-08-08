import { createRouter, createWebHistory } from 'vue-router'
import SplashView from '../views/SplashView.vue'
import IdentityView from '../views/IdentityView.vue'
import HomeView from '../views/HomeView.vue'
import StudioView from '../views/StudioView.vue'
import { useLoadingStore } from '../stores/loading'
import { getIdentity } from '../data/wendao-lineage'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'splash', component: SplashView },
    // 首页总览 —— 最外层，直接看到最近与常用的项目
    { path: '/home', name: 'home', component: HomeView },
    { path: '/identity', name: 'identity', component: IdentityView },
    { path: '/studio', name: 'studio', component: StudioView },
  ],
})

// 页面跳转时展示加载动画（首屏 splash → identity 不触发，避免叠在启动动画上）
// 进工作室这一跳，顺手把该身份的那句话打在加载层上 —— 等待的两秒也是内容。
router.beforeEach((to, from, next) => {
  if (from.name && from.name !== 'splash') {
    const id = localStorage.getItem('wenzai:last-identity')
    let msg = '载入中…'
    if (to.name === 'studio' && id) {
      const identity = getIdentity(id)
      msg = `${identity.name} · ${identity.maxim.text}`
    } else if (to.name === 'home') {
      msg = '正在整理你的书案…'
    }
    useLoadingStore().show(msg)
  }
  next()
})
router.afterEach((_to, from) => {
  if (from.name && from.name !== 'splash') {
    const loading = useLoadingStore()
    setTimeout(() => loading.hide(), 480)
  }
})

export default router
