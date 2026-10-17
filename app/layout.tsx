import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ori Dimension — See the real size",
  description:
    "Compare a 3D printer with real-world scale objects in an interactive, proportional 3D scene."
};

export const viewport: Viewport = {
  themeColor: "#090c10",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
