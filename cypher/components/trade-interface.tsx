"use client"

import { useEffect, useState } from "react"
import { ArrowDownUp, Info, Send } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TokenProvider, useToken } from "@/lib/tokenProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function TradeInterface() {
  const {
    buy,
    calculatePurchaseReturn,
    calculateSaleReturn,
    getBalance,
    getConstants,
    getTokenInfo, 
    sell
  } = useToken();

  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState("0")
  const [inputAmount, setInputAmount] = useState("")
  const [outputAmount, setOutputAmount] = useState("")
  const [activeTab, setActiveTab] = useState("buy")
  const [tokenInfo, setTokenInfo] = useState<any>(null)

  // Update balance and token info when component mounts
  useEffect(() => {
    const updateInfo = async () => {
      const [balance, info] = await Promise.all([
        getBalance(),
        getTokenInfo()
      ]);
      setBalance(balance);
      setTokenInfo(info);
    };
    updateInfo();
  }, [getBalance, getTokenInfo]);

  // Calculate output amount when input changes
  useEffect(() => {
    const calculateOutput = async () => {
      if (!inputAmount) {
        setOutputAmount("");
        return;
      }

      try {
        const amount = activeTab === "buy"
          ? await calculatePurchaseReturn(inputAmount)
          : await calculateSaleReturn(inputAmount);
        setOutputAmount(amount);
      } catch (error) {
        console.error(error);
        setOutputAmount("");
      }
    };
    calculateOutput();
  }, [inputAmount, activeTab, calculatePurchaseReturn, calculateSaleReturn]);

  const handleTrade = async () => {
    if (!inputAmount) return;

    setLoading(true);
    try {
      if (activeTab === "buy") {
        await buy(inputAmount);
      } else {
        await sell(inputAmount);
      }
      setInputAmount("");
      setOutputAmount("");
      const newBalance = await getBalance();
      setBalance(newBalance);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [messages, setMessages] = useState([
    { id: 1, user: "Alice", content: "Just bought some CPUP! To the moon! 🚀", timestamp: "2023-06-10T10:30:00Z" },
    { id: 2, user: "Bob", content: "What's the current market sentiment?", timestamp: "2023-06-10T10:35:00Z" },
    { id: 3, user: "Charlie", content: "Holding strong. Diamond hands! 💎🙌", timestamp: "2023-06-10T10:40:00Z" },
  ])
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          user: "Anonymous",
          content: newMessage,
          timestamp: new Date().toISOString(),
        },
      ])
      setNewMessage("")
    }
  }

  return (
    <div className="container py-20">
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Price Chart</CardTitle>
            <CardDescription>Token price over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[/* Your price data here */]}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Trade</CardTitle>
              <CardDescription>Swap tokens using the bonding curve</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="buy" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy">Buy</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
                <TabsContent value="buy" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Input (ETH)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label>Output (CPUP)</Label>
                    <Input type="text" value={outputAmount} readOnly disabled={loading} />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleTrade}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Buy CPUP"}
                  </Button>
                </TabsContent>
                <TabsContent value="sell" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Input (CPUP)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        disabled={loading}
                      />
                      <Button
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2"
                        onClick={() => setInputAmount(balance)}
                        disabled={loading}
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label>Output (ETH)</Label>
                    <Input type="text" value={outputAmount} readOnly disabled={loading} />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleTrade}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Sell CPUP"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Statistics</CardTitle>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Key metrics for the token</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Balance</span>
                <span className="font-medium">{parseFloat(balance).toFixed(4)} CPUP</span>
              </div>
              {tokenInfo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Supply</span>
                    <span className="font-medium">{tokenInfo.totalSupply} CPUP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Virtual ETH Reserve</span>
                    <span className="font-medium">{tokenInfo.virtualEthReserve} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">
                      {tokenInfo.migrated ? 'Migrated to Uniswap' : 'Active'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Degen Forum</CardTitle>
            <CardDescription>Chat with other traders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-[300px] overflow-y-auto space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarFallback>{message.user.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{message.user}</p>
                      <p className="text-sm text-muted-foreground">{message.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

