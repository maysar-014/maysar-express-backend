import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maysar Supplier Console',
  description: 'Professional supplier management platform for Maysar Digital Community Trade Network',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}