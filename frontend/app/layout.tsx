import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";

// Metadata controls browser tab title and basic SEO/app description.
export const metadata: Metadata = {
  title: "Freight Command Center",
  description: "Realtime freight dispatch operations terminal"
};

// RootLayout wraps every page in the app.
// Providers are placed here so global tools like TanStack Query work everywhere.
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
