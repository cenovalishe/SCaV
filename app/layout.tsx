import type { Metadata } from "next";
import "./globals.css";
import { ROOM_IMAGES } from '@/lib/mapData';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Предзагрузка всех изображений камер из мапы */}
        {Object.values(ROOM_IMAGES).map((src) => (
          <link key={src} rel="preload" href={src} as="image" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}

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
