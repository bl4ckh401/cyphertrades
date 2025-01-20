"use client"

import { WalletIcon } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

import { useFactory } from "@/lib/provider"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export function Header() {
  const { address, connecting, connectWallet } = useFactory()

  return (
    <header className="fixed top-0 w-full flex flex-row items-center justify-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/cyp.png" alt="CypherPup" width={32} height={32} />
            <span className="text-xl font-bold">CypherPup</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/trade" className="text-sm font-medium hover:text-primary">
              Trade
            </Link>
            <Link href="/tokens" className="text-sm font-medium hover:text-primary">
              Tokens
            </Link>
            <Link href="/portfolio" className="text-sm font-medium hover:text-primary">
              Portfolio
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <ModeToggle />
          <Button
            variant="outline"
            className="gap-2"
            onClick={connectWallet}
            disabled={connecting}
          >
            <WalletIcon className="h-4 w-4" />
            {connecting ? (
              "Connecting..."
            ) : address ? (
              address.slice(0, 6) + "..." + address.slice(-4)
            ) : (
              "Connect Wallet"
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}

