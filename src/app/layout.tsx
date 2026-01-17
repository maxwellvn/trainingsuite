import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rhapsody Training Suite",
  description: "A comprehensive training platform for missions and outreach",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
