"use client";
import { useSearchParams } from "next/navigation";
import { TokenProvider } from "@/lib/tokenProvider";
import TradeInterface from "@/components/trade-interface";

export default function TradePage() {
  const searchParams = useSearchParams();
  const tokenAddress = searchParams.get("token");

  if (!tokenAddress) {
    return <div>Error: No token address provided.</div>;
  }

  return (
    <TokenProvider tokenAddress={tokenAddress}>
      <TradeInterface />
    </TokenProvider>
  );
}
