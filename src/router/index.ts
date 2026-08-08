import { createRouter, createWebHistory } from 'vue-router'
import SplashView from '../views/SplashView.vue'
import IdentityView from '../views/IdentityView.vue'
import StudioView from '../views/StudioView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'splash', component: SplashView },
    { path: '/identity', name: 'identity', component: IdentityView },
    { path: '/studio', name: 'studio', component: StudioView },
  ],
})

export default router
