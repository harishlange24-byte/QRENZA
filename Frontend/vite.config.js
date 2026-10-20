import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Qrenza",
        short_name: "Qrenza",
        description: "Digital stamp cards, menus, and queues",
        theme_color: "#ffffff",
        background_color: "#f7f7fb",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    // Bind to every interface so a phone on the same Wi-Fi can open the QR
    // link (http://<lan-ip>:5173/s/<code>) during local testing.
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true
      }
    }
  }
});
