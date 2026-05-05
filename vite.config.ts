
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do arquivo .env baseado no modo (development/production)
  // O terceiro argumento '' garante que carregue todas as variáveis, não apenas as com prefixo VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        manifestFilename: 'manifest.json',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: ['icon-192x192.png', 'icon-512x512.png'],
        devOptions: {
          enabled: false,
          type: 'module'
        },
        manifest: {
          id: "cyberphone-pwa-v1",
          short_name: "CyberPhone",
          name: "CyberPhone",
          description: "A próxima geração da rede social CyBerPhone. Conectando mentes e transformando o futuro.",
          theme_color: "#0a0c10",
          background_color: "#0a0c10",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            }
          ],
          shortcuts: [
            {
              name: "Feed Principal",
              short_name: "Feed",
              description: "Veja o que há de novo no CyberPhone",
              url: "/?page=feed",
              icons: [{ "src": "icon-192x192.png", "sizes": "192x192" }]
            },
            {
              name: "Ver Reels",
              short_name: "Reels",
              description: "Assista vídeos curtos",
              url: "/?page=reels-page",
              icons: [{ "src": "icon-192x192.png", "sizes": "192x192" }]
            }
          ]
        }
      })
    ],
    define: {
      // Polyfill para process.env para evitar erros de 'process is not defined'
      'process.env': env,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true
    }
  };
});
