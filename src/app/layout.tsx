import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BIT IEEE Hub Portal",
  description: "Official IEEE Society Hub for Bannari Amman Institute of Technology — Manage societies, track activity points, build resumes, and engage in events.",
  keywords: ["IEEE", "BITS Sathy", "Bannari Amman", "Society Hub", "Activity Points"],
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bebasNeue.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-body">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            theme="dark"
            toastOptions={{
              style: {
                background: '#132240',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
