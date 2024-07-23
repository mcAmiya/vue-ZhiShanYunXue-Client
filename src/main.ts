import './assets/main.css'

import {createApp} from 'vue'
import {createPinia} from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
export const api_url = window.Config.api_url
export const page_url = window.location.origin + window.Config.page_url


app.use(createPinia())
app.use(router)

app.mount('#app')
