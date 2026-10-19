import { fileURLToPath, URL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { nodePolyfills } from 'vite-plugin-node-polyfill';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';

const wasmMiddleware = () => {
  return {
    name: 'wasm-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.endsWith('venom_card_extra_wasm_bg.wasm') || req.url.endsWith('zxing_reader.wasm')) {
          const wasmPath = path.join(__dirname, 'src/api/pkg/', path.basename(req.url));
          const wasmFile = fs.readFileSync(wasmPath);
          res.setHeader('Content-Type', 'application/wasm');
          res.end(wasmFile);
          return;
        }
        if (req.url.endsWith('nekoton_wasm_bg.wasm')) {
          const wasmPath = path.join(__dirname, 'node_modules/nekoton-wasm/', path.basename(req.url));
          const wasmFile = fs.readFileSync(wasmPath);
          res.setHeader('Content-Type', 'application/wasm');
          res.end(wasmFile);
          return;
        }
        next();
      });
    },
  };
};

export default async ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const env = loadEnv(mode, process.cwd(), '');
  const isProductionBuild = mode === 'production';

  let derivedKeyHex = '';
  let legacyDerivedKeyHex = '';
  if (env.UNITED_CARDS_KEY) {
    derivedKeyHex = crypto.pbkdf2Sync(env.UNITED_CARDS_KEY, 'salt', 600000, 32, 'sha1').toString('hex');
    legacyDerivedKeyHex = crypto.pbkdf2Sync(env.UNITED_CARDS_KEY, 'salt', 100, 32, 'sha1').toString('hex');
  }

  return defineConfig({
    server: {
      port: 8081,
      host: true,
      watch: {
        usePolling: true
      },
    },
    define: {
      UNITED_CARDS_KEY: JSON.stringify(env.UNITED_CARDS_KEY),
      UNITED_CARDS_DERIVED_KEY: JSON.stringify(derivedKeyHex),
      UNITED_CARDS_LEGACY_DERIVED_KEY: JSON.stringify(legacyDerivedKeyHex),
      UNITED_CARDS_IV_KEY: JSON.stringify(env.UNITED_CARDS_IV_KEY),
      UNITED_CONNECT_PROJECT_ID: JSON.stringify(env.UNITED_CONNECT_PROJECT_ID || process.env.UNITED_CONNECT_PROJECT_ID || '')
    },
    plugins: [
      vue(),
      nodePolyfills({ overrides: { fs: 'memfs' } }),
      wasmMiddleware(),
      VueI18nPlugin({
        include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),
        runtimeOnly: false,
        compositionOnly: true,
        strictMessage: false,
        escapeHtml: false
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: [
        '.js',
        '.json',
        '.jsx',
        '.mjs',
        '.ts',
        '.tsx',
        '.vue',
        '.wasm',
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData:
            `@use "@/assets/scss/components/_fonts.scss" as *; @use "@/assets/scss/components/_mixins.scss" as *; @use "@/assets/scss/components/_colors.scss" as *;`,
        },
      },
    },
    // assetsInclude: ['**/*.wasm'], //AI
    root: 'src',
    build: {
      minify: 'terser',
      ...(isProductionBuild && {
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          format: {
            comments: false,
          },
        },
      }),
      publicDir: 'public',
      outDir: '../public',
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      modulePreload: {
        polyfill: true,
      },
      cssCodeSplit: true,
      commonjsOptions: {
        transformMixedEsModules: true,
        strictRequires: true,
        dynamicRequireTargets: [
          'node_modules/everscale-standalone-client/*/*.js',
        ],
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("everscale-standalone-client")) {
                return "vendor_everscale-standalone-client";
              }
              if (id.includes("everscale-inpage-provider")) {
                return "vendor_everscale-inpage-provider";
              }
              if (id.includes("nekoton-wasm")) {
                return "vendor_nekoton-wasm";
              }
              const lastNodeModules = id.toString().split("node_modules/").pop();
              const parts = lastNodeModules.split("/");
              const pkgName = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
              const hash = crypto.createHash('md5').update(pkgName).digest('hex').substring(0, 8);
              return `v-${hash}`;
            }
          },
          assetFileNames: (assetInfo) => {
            if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name)) {
              return 'assets/fonts/[name][extname]';
            }
            return 'assets/[ext]/[name].[hash][extname]';
          },
          chunkFileNames: 'assets/js/chunks/[name].[hash].js',
          entryFileNames: 'assets/js/[name].[hash].js',
        },
      },
    },
  })
}
