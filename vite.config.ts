import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('react-dom')) {
            return 'vendor-react-dom';
          }
          if (id.includes('react-router-dom') || id.includes('react-router')) {
            return 'vendor-react-router';
          }
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-lucide-react';
          }
          if (id.includes('qrcode.react')) {
            return 'vendor-qrcode-react';
          }
          if (id.includes('xstate') || id.includes('@xstate')) {
            return 'vendor-xstate';
          }
          if (id.includes('react-webcam')) {
            return 'vendor-react-webcam';
          }
          if (id.includes('tailwind-merge') || id.includes('tailwindcss')) {
            return 'vendor-css';
          }
          if (id.includes('class-variance-authority')) {
            return 'vendor-cva';
          }
          if (id.includes('ts-pattern')) {
            return 'vendor-ts-pattern';
          }
          if (id.includes('clsx')) {
            return 'vendor-clsx';
          }

          return 'vendor';
        },
      },
    },
  },
});
