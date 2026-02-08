import type { Metadata } from "next";
import { JetBrains_Mono, Kanit } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-sans', weight: ['300']});

const kanit = Kanit({
  subsets: ["latin"],
  variable: "--font-kanit",
  weight: ['300'],
});

export const metadata: Metadata = {
  title: "Mod checker",
  description: "ตรวจสอบมอดสำหรับการลงเซิพเวอร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body
        className={`${kanit.variable} antialiased h-full`}
      >
        {children}
      </body>
    </html>
  );
}
