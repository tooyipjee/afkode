import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [
    electron([
      {
        entry: resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist-electron/main'),
            rollupOptions: {
              external: ['node-pty'],
            },
          },
        },
      },
      {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist-electron/preload'),
          },
        },
      },
    ]),
    renderer(),
  ],
});
