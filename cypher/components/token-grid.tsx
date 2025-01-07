"use client"

import { useEffect, useState } from "react"
import { Search, Sparkles, TrendingUp, BarChart3 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TokenCard } from "@/components/token-card"
import { useFactory } from "@/lib/provider"
import { useToken } from "@/lib/tokenProvider"

interface DeployedToken {
  address: string;
  owner: string;
  name: string;
  symbol: string;
  marketCap: string;
  volume: string;
  price: number;
  change24h: number;
  description?: string;
  createdAt: string;
}

interface TokenGridProps {
  limit?: number;
}

export function TokenGrid({ limit }: TokenGridProps) {
  const { getDeployedTokens } = useFactory();
  const [tokens, setTokens] = useState<DeployedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"new" | "marketCap" | "volume">("new")

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const deployedTokens = await getDeployedTokens();
        const tokensWithDetails = await Promise.all(
          deployedTokens.map(async (token) => {
            // Here you would fetch additional details for each token
            // For now using placeholder data
            return {
              ...token,
              name: `CypherPup ${token.address.slice(0, 6)}`,
              symbol: "CPUP",
              marketCap: "1.2M",
              volume: "450K",
              price: 5542.543,
              change24h: 12.5,
              description: "A new CypherPup token instance.",
              createdAt: new Date(token.timestamp * 1000).toLocaleString()
            };
          })
        );

        setTokens(tokensWithDetails);
      } catch (error) {
        console.error("Error fetching tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [getDeployedTokens]);

  const sortedAndFilteredTokens = tokens
    .filter(
      (token) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "marketCap":
          return Number(b.marketCap.replace(/[^0-9.-]+/g,"")) - 
                 Number(a.marketCap.replace(/[^0-9.-]+/g,""));
        case "volume":
          return Number(b.volume.replace(/[^0-9.-]+/g,"")) - 
                 Number(a.volume.replace(/[^0-9.-]+/g,""));
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    })
    .slice(0, limit);

  if (loading) {
    return <div>Loading tokens...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("new")}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            New
          </Button>
          <Button
            variant={sortBy === "marketCap" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("marketCap")}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Market Cap
          </Button>
          <Button
            variant={sortBy === "volume" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("volume")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Volume
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAndFilteredTokens.map((token) => (
          <TokenCard key={token.address} token={token} />
        ))}
      </div>
    </div>
  )
}

