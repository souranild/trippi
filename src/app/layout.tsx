import type { Metadata } from "next";
import "./globals.css";
import "@/styles/design-system.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Trippi",
  description: "Global travel companion for the modern explorer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
