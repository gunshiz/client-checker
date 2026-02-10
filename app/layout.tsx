import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["latin"],
  variable: "--font-kanit",
  weight: ['300'],
});

export const metadata: Metadata = {
  title: "Client Checker",
  description: "ตรวจสอบมอดสำหรับการลงเซิพเวอร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${kanit.className} antialiased h-full`}
      >
        {children}
      </body>
    </html>
  );
}
