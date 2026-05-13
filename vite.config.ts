import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
          "vendor-tf": [
            "@tensorflow/tfjs",
            "@tensorflow/tfjs-backend-webgl",
            "@tensorflow-models/face-detection",
            "@tensorflow-models/face-landmarks-detection",
            "@tensorflow-models/coco-ssd",
            "@mediapipe/face_detection",
          ],
          "vendor-leaflet": ["leaflet"],
          "vendor-d3": ["d3-selection", "d3-zoom"],
        },
      },
    },
  },
});
