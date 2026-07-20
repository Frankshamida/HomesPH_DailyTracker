import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homes.ph Daily Task Tracker",
    short_name: "Daily Tracker",
    description:
      "Attendance, time-in/out and daily task tracker for the Homes.ph team.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#1e2a8c",
    icons: [
      { src: "/homesph-mark.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/homesph-mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/homesph-mark.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
