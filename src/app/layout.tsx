import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StudyProvider } from "@/components/study-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "Studify",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Studify" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  title: "Studify — Estudo inteligente com IA",
  description: "Planeje, execute, acompanhe e ajuste seus estudos com IA.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0B1220", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body><StudyProvider>{children}</StudyProvider></body>
    </html>
  );
}
