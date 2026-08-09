import { createRouter, createWebHistory } from 'vue-router'
import SplashView from '../views/SplashView.vue'
import IdentityView from '../views/IdentityView.vue'
import StudioView from '../views/StudioView.vue'
import { useLoadingStore } from '../stores/loading'
import { IDENTITY_ORDER, type IdentityId } from '../data/wendao-lineage'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'splash', component: SplashView },
    { path: '/identity', name: 'identity', component: IdentityView },
    { path: '/studio/:identity?', name: 'studio', component: StudioView, props: true },
  ],
})

export function isValidIdentity(id: string): id is IdentityId {
  return IDENTITY_ORDER.includes(id as IdentityId)
}

// 页面跳转时展示加载动画（首屏 splash → identity 不触发，避免叠在启动动画上）
router.beforeEach((_to, from, next) => {
  if (from.name && from.name !== 'splash') {
    useLoadingStore().show({ label: '载入中…' })
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
