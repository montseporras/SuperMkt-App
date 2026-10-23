import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Compras de casa",
  description: "La lista de compras compartida de tu hogar. Se abre con un toque desde la heladera.",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/icons/192", sizes: "192x192", type: "image/png" }], apple: "/icons/180" },
  appleWebApp: { capable: true, title: "Compras de casa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f7d5b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <SwRegister />
        <Toaster position="top-center" duration={3500} />
      </body>
    </html>
  );
}
