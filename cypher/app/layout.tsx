import { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { FactoryProvider } from "@/lib/provider"
import { Toaster } from "@/components/ui/toaster"
import { Header } from "@/components/header"
import "./globals.css"
import { TokenProvider } from "@/lib/tokenProvider"

export const metadata: Metadata = {
  title: "CypherPup - The Future of Meme Coins",
  description: "Trade and manage CypherPup tokens with our advanced trading platform.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FactoryProvider>
            <div className="relative min-h-screen w-screen">
              <div className="fixed inset-0 noise-bg w-screen flex flex-col justify-center items-center" />
              <Header />
              <main className="relative w-screen flex flex-col items-center min-h-screen pt-16">
                {children}
              </main>
            </div>
            <Toaster />
          </FactoryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}