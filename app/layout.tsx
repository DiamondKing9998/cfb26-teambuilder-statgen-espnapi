// src/app/layout.tsx

import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google"; // <--- NEW IMPORTS

import "./globals.css"; // Import global styles

// Configure Bebas Neue for headings/display
const bebasNeue = Bebas_Neue({
  weight: "400", // Bebas Neue only has one weight
  subsets: ["latin"],
  variable: "--font-bebas-neue", // Define CSS variable for easy use
  display: "swap", // Ensures font is displayed quickly
});

// Configure Inter for body text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // Define CSS variable for easy use
  display: "swap",
});


export const metadata: Metadata = {
  title: "CFB 26 TeamBuilder Auto-Generator",
  description: "College Football Player Search and Team Building Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        // Apply both font variables to the body.
        // We'll then use these variables in globals.css for specific elements.
        className={`${bebasNeue.variable} ${inter.variable} antialiased`}
      >
        {children} {/* This is where your page.tsx content will be rendered */}
      </body>
    </html>
  );
}