import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),
  {
    name: 'post-start-log',
    configureServer(server) {
      server.httpServer.once('listening', () => {
        const address = server.httpServer.address();
        setTimeout(() => {
          console.info()
          console.info(' _________________________________________')
          console.info('| INSTRUCTIONS FOR THE BIG SCREEN         |');
          console.info(`| 1. Open http://localhost:${address.port} in Chrome |`);
          console.info(`| 2. Go full screen                       |`);
          console.info(`|   - Three dots top right                |`);
          console.info(`|   - Square icon halfway the menu on the |`);
          console.info(`|     right (Full screen)                 |`);
          console.info(`| 3. Refresh the page (Ctrl + Shift + R)  |`);
          console.info('|_________________________________________|')
        }, 10);
      });
    }
  }
  ],
})
