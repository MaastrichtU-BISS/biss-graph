import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { KIOSK } from './screenMode'
import { startAnalytics } from './analytics'

if (KIOSK) document.documentElement.classList.add('kiosk-lite');
startAnalytics();

createApp(App).mount('#app');
