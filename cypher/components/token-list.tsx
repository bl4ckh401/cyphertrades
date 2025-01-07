"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const tokens = [
  {
    id: 1,
    name: "CypherPup",
    symbol: "CPUP",
    price: 0.12,
    change24h: 5.2,
    marketCap: 1234567,
    volume24h: 123456,
  },
  {
    id: 2,
    name: "HoloPup",
    symbol: "HPUP",
    price: 0.05,
    change24h: -2.1,
    marketCap: 567890,
    volume24h: 45678,
  },
  {
    id: 3,
    name: "TechnoPup",
    symbol: "TPUP",
    price: 0.08,
    change24h: 1.5,
    marketCap: 789012,
    volume24h: 67890,
  },
  {
    id: 4,
    name: "CyberPup",
    symbol: "CYBP",
    price: 0.15,
    change24h: 3.7,
    marketCap: 1500000,
    volume24h: 200000,
  },
  {
    id: 5,
    name: "NeonPup",
    symbol: "NPUP",
    price: 0.03,
    change24h: -1.2,
    marketCap: 300000,
    volume24h: 30000,
  },
]

interface TokenListProps {
  limit?: number
}

export function TokenList({ limit }: TokenListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTokens = tokens
    .filter(
      (token) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, limit)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Token</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">24h Change</TableHead>
          <TableHead className="text-right">Market Cap</TableHead>
          <TableHead className="text-right">24h Volume</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredTokens.map((token) => (
          <TableRow key={token.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Image
                  src="/placeholder.svg"
                  alt={token.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <div>
                  <div>{token.name}</div>
                  <div className="text-sm text-muted-foreground">{token.symbol}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">${token.price.toFixed(4)}</TableCell>
            <TableCell
              className={`text-right ${
                token.change24h >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {token.change24h > 0 ? "+" : ""}
              {token.change24h.toFixed(2)}%
            </TableCell>
            <TableCell className="text-right">${token.marketCap.toLocaleString()}</TableCell>
            <TableCell className="text-right">${token.volume24h.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" asChild>
                <Link href={`/trade?token=${token.symbol}`}>Trade</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

