export default defineConfig({
  base: '/IRPG-INCOME-GAME/',
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the build works from any sub-path, e.g. https://<user>.github.io/<repo>/
export default defineConfig({ base: './', plugins: [react(), tailwindcss()] })
