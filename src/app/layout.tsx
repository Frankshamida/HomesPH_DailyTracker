import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/pwa/install-prompt";
import UpdatePrompt from "@/components/pwa/update-prompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Homes.ph Daily Task Tracker",
  description: "Attendance & daily task tracker for Homes.ph",
  manifest: "/manifest.webmanifest",
  applicationName: "Daily Task Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daily Tracker",
  },
  icons: {
    icon: "/homesph-mark.png",
    apple: "/homesph-mark.png",
    shortcut: "/homesph-mark.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e2a8c" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1533" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hph-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
        <UpdatePrompt />
      </body>
    </html>
  );
}
