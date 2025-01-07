"use client"
import { TokenProvider } from "@/lib/tokenProvider"
import TradeInterface from "@/components/trade-interface"

export default function TradePage({ params }: { params: { address: string } }) {
  return (
    <TokenProvider tokenAddress={params.address}>
      <TradeInterface />
    </TokenProvider>
  )
}