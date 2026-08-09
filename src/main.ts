import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import './styles/tokens.css'
import './styles/skins.css'
import './styles/textures.css'
import './styles/base.css'
import './styles/components.css'
import './styles/theme-components.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
