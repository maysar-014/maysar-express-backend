import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maysar Enabler Console",
  description: "Professional enabler dashboard for Maysar Digital Community Trade Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}