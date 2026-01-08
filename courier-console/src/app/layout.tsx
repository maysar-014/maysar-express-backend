import './globals.css'
import { ThemeProvider } from '../lib/theme-context'

export const metadata = {
  title: 'Maysar Courier Console',
  description: 'Door-to-door delivery management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
