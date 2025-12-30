import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCaV - Scavengers and Animatronics",
  description: "Horror survival board game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-mono antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}
