import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4101,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          "vendor-d3": ["d3-selection", "d3-zoom"],
          "vendor-maps": ["react-simple-maps", "topojson-client"],
          "vendor-recharts": ["recharts"],
          "vendor-pdf": ["html2pdf.js"],
          "vendor-icons": [
            "lucide-react",
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/react-fontawesome",
          ],
        },
      },
    },
  },
});
