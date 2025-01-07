"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Clock, DollarSign, LineChart, Wallet } from 'lucide-react'
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// Sample data - In a real app, this would come from your Web3Provider
const portfolioData = {
  totalValue: 15234.56,
  changePercent: 12.34,
  holdings: [
    {
      id: 1,
      name: "CypherPup",
      symbol: "CPUP",
      amount: 1000,
      value: 12000,
      price: 12,
      change24h: 5.2,
      imageUrl: "/placeholder.svg",
    },
    {
      id: 2,
      name: "HoloPup",
      symbol: "HPUP",
      amount: 500,
      value: 2500,
      price: 5,
      change24h: -2.1,
      imageUrl: "/placeholder.svg",
    },
    {
      id: 3,
      name: "TechnoPup",
      symbol: "TPUP",
      amount: 300,
      value: 734.56,
      price: 2.45,
      change24h: 1.5,
      imageUrl: "/placeholder.svg",
    },
  ],
  transactions: [
    {
      id: 1,
      type: "buy",
      token: "CPUP",
      amount: 100,
      price: 10,
      total: 1000,
      timestamp: "2024-01-07T10:00:00Z",
      hash: "0x1234...5678",
    },
    {
      id: 2,
      type: "sell",
      token: "HPUP",
      amount: 50,
      price: 5,
      total: 250,
      timestamp: "2024-01-07T09:30:00Z",
      hash: "0x5678...9012",
    },
    {
      id: 3,
      type: "buy",
      token: "TPUP",
      amount: 200,
      price: 2,
      total: 400,
      timestamp: "2024-01-07T09:00:00Z",
      hash: "0x9012...3456",
    },
  ],
  performanceData: [
    { time: "00:00", value: 14000 },
    { time: "04:00", value: 14250 },
    { time: "08:00", value: 14100 },
    { time: "12:00", value: 14800 },
    { time: "16:00", value: 15100 },
    { time: "20:00", value: 15234.56 },
  ],
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState("holdings")

  // if (!address) {
  //   return (
  //     <div className="container py-20">
  //       <Card>
  //         <CardContent className="flex flex-col items-center justify-center py-20">
  //           <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
  //           <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
  //           <p className="text-muted-foreground mb-4">
  //             Connect your wallet to view your portfolio
  //           </p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   )
  // }

  return (
    <div className="container py-20">
      <div className="grid gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${portfolioData.totalValue.toLocaleString()}</div>
              <div className={`flex items-center text-xs ${
                portfolioData.changePercent >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {portfolioData.changePercent >= 0 ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(portfolioData.changePercent)}%
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Performance</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={portfolioData.performanceData}>
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="holdings">Holdings</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Tabs>
            <TabsContent value="holdings" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">24h</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioData.holdings.map((holding) => (
                    <TableRow key={holding.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={holding.imageUrl} alt={holding.name} />
                            <AvatarFallback>{holding.symbol.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{holding.name}</div>
                            <div className="text-sm text-muted-foreground">{holding.symbol}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {holding.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${holding.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${holding.value.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right ${
                        holding.change24h >= 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {holding.change24h > 0 ? "+" : ""}
                        {holding.change24h.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="transactions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead className="text-right">Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioData.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          tx.type === "buy" 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-red-500/10 text-red-500"
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{tx.token}</TableCell>
                      <TableCell className="text-right">{tx.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${tx.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${tx.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" className="h-auto p-0" asChild>
                          <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                            {tx.hash}
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

