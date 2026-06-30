// app/manifest.ts
export const manifest = {
  name: "PunchIn",
  short_name: "PunchIn",
  description: "Attendance tracking app",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#fa972d",
  icons: [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png"
    }
  ]
};
