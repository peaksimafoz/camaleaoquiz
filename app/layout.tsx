import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://camaleaoquiz.vercel.app'),
  title: 'Felipe Felipetti — Comunicação e Oratória',
  description: 'Descubra seu perfil e destrave sua comunicação.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
