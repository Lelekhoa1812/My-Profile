import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], weight: ["300", "400", "500"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Liam Le · AI Software Engineer",
  description: "I build and own the AI stack. A technical advance counts only when the business can measure it.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "normal",
};

const themeScript = `(function(){try{var t=localStorage.getItem("profile.theme");if(t!=="light"&&t!=="dark")t="dark";var root=document.documentElement;root.dataset.theme=t;root.style.colorScheme=t;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",t==="light"?"#f3f4f0":"#000000");}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <TooltipProvider delay={120}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
