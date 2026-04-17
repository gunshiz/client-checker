import type { Metadata } from "next";
import { Kanit, Roboto, Noto_Sans, Anuphan } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});


const kanit = Kanit({
  subsets: ["latin"],
  variable: "--font-kanit",
  weight: ['300'],
});

export const metadata: Metadata = {
  title: "Client Checker"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", anuphan.variable, robotoHeading.variable, "font-sans", notoSans.variable)}>
      <body
        className={`${kanit.className} antialiased h-full dark` }
      >
        {children}
      </body>
    </html>
  );
}
