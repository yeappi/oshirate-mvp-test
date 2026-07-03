import type { Metadata, Viewport } from 'next'
import './globals.css'
import QuickNav from '@/components/layout/QuickNav'

export const metadata: Metadata = {
  title: '推されーと',
  description: 'ファン応援サービス',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '推されーと',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fbfffd',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;800;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="推されーと" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <QuickNav />
        {children}
      </body>
    </html>
  )
}
