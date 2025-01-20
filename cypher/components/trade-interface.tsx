"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Info, Send } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useToken } from "@/lib/tokenProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatEther, parseEther, parseUnits } from "ethers";
import { constants } from "buffer";
import CandlestickChart from "./CandleStickChart";
import { TokenDatafeed } from "@/lib/tradingViewDatafeed";


export default function TradeInterface() {
  const {
    buy,
    sell,
    getBalance,
    getConstants,
    getTokenInfo,
    calculatePurchaseReturn,
    calculateSaleReturn,
    loading,
    address, 
    contract
  } = useToken();

  const [balance, setBalance] = useState("0");
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [activeTab, setActiveTab] = useState("buy");
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [priceData, setPriceData] = useState<{ time: string; price: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, user: "Alice", content: "Just bought some tokens! 🚀", timestamp: "2023-06-10T10:30:00Z" },
    { id: 2, user: "Bob", content: "What's the market sentiment?", timestamp: "2023-06-10T10:35:00Z" },
  ]);
  const datafeedRef = useRef<TokenDatafeed>();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [candleData, setCandleData] = useState<{
    x: number;
    o: number;
    h: number;
    l: number;
    c: number;
  }[]>([]);
  
  const [currentCandle, setCurrentCandle] = useState<{
    open: number;
    high: number;
    low: number;
    timestamp: number;
  } | null>(null);



  useEffect(() => {
    if (loading || !contract || !window.TradingView) return;

    if (!datafeedRef.current) {
      datafeedRef.current = new TokenDatafeed();
    }

    const widget = new window.TradingView.widget({
      symbol: 'TOKEN/ETH',
      interval: '1',
      container_id: chartContainerRef.current!.id,
      datafeed: datafeedRef.current,
      library_path: '/charting_library/',
      locale: 'en',
      disabled_features: ['use_localstorage_for_settings'],
      enabled_features: ['study_templates'],
      timezone: 'Etc/UTC',
      fullscreen: false,
      autosize: true,
    });

    const updatePriceData = async () => {
      try {
        const info = await getTokenInfo();
        if (datafeedRef.current && info) {
          datafeedRef.current.updatePrice(info.virtualEthReserve, info.virtualTokenReserve);
        }
      } catch (error) {
        console.error('Error updating price:', error);
      }
    };

    updatePriceData();

    const transferFilter = contract.filters.Transfer();
    contract.on(transferFilter, () => {
      updatePriceData();
    });

    const interval = setInterval(updatePriceData, 10000);

    return () => {
      clearInterval(interval);
      contract.off(transferFilter);
    };
  }, [loading, contract, getTokenInfo]);

  

  useEffect(() => {
    if (loading) return;
  
    const calculatePrice = (info: any) => {
      return Number(formatEther(info.virtualEthReserve)) / Number(formatEther(info.virtualTokenReserve));
    };
  
    const updateInfo = async () => {
      try {
        const [balance, info, constants] = await Promise.all([
          getBalance(address),
          getTokenInfo(),
          getConstants(),
        ]);
  
        setBalance(balance);
        setTokenInfo(info);
  
        const currentPrice = calculatePrice(info);
        const currentTime = Date.now();
  
        // Update current candle
        if (!currentCandle) {
          // Initialize first candle
          setCurrentCandle({
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            timestamp: currentTime
          });
        } else {
          // Update existing candle
          setCurrentCandle(prev => {
            if (!prev) return null;
            return {
              ...prev,
              high: Math.max(prev.high, currentPrice),
              low: Math.min(prev.low, currentPrice)
            };
          });
        }
      } catch (error) {
        console.error("Error fetching bonding curve data:", error);
      }
    };
  
    updateInfo();
  
    const priceUpdateInterval = setInterval(updateInfo, 10000);
  
    const candleInterval = setInterval(() => {
      setCurrentCandle(prev => {
        if (!prev) return null;
  
        const newCandle = {
          x: prev.timestamp,
          o: prev.open,
          h: prev.high,
          l: prev.low,
          c: tokenInfo ? calculatePrice(tokenInfo) : prev.open
        };
  
        setCandleData(prevData => [...prevData, newCandle]);
  
        const now = Date.now();
        const currentPrice = tokenInfo ? calculatePrice(tokenInfo) : prev.open;
        return {
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          timestamp: now
        };
      });
    }, 60000);
  
    return () => {
      clearInterval(priceUpdateInterval);
      clearInterval(candleInterval);
    };
  }, [loading, getBalance, getTokenInfo, getConstants]);
  
  

  useEffect(() => {
    const calculateOutput = async () => {
      if (!inputAmount) {
        setOutputAmount("");
        return;
      }

      try {
        const amount =
          activeTab === "buy"
            ? await calculatePurchaseReturn(inputAmount)
            : await calculateSaleReturn(inputAmount);
        setOutputAmount(amount);
      } catch (error) {
        console.error("Error calculating output:", error);
        setOutputAmount("");
      }
    };

    calculateOutput();
  }, [inputAmount, activeTab, calculatePurchaseReturn, calculateSaleReturn]);

  const handleTrade = async () => {
    if (!inputAmount) return;

    // setLoading(true);
    try {
      if (activeTab === "buy") {
        console.log("Buying tokens...");
        await buy(inputAmount);
        console.log("Bought tokens!");
      } else {
        console.log("Selling tokens...");
        await sell(inputAmount);
        console.log("Sold tokens!");
      }

      // Reset input and update balance and stats
      setInputAmount("");
      setOutputAmount("");
      const [newBalance, constants] = await Promise.all([getBalance(), getConstants()]);
      setBalance(newBalance);
      setTokenInfo((prev:any) => ({
        ...prev,
        virtualEthReserve: constants.INITIAL_VIRTUAL_ETH_RESERVE,
        virtualTokenReserve: constants.INITIAL_VIRTUAL_TOKEN_RESERVE,
      }));
    } catch (error) {
      console.error("Trade failed:", error);
    } finally {
      // setLoading(false);
    }
  };

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
      ]);
      setNewMessage("");
    }
  };


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-20">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Price Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Price Chart</CardTitle>
            <CardDescription>Token price over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <div className="h-[400px]" ref={chartContainerRef} />
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trading Section */}
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
                  <Label>Input (ETH)</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    disabled={loading}
                  />
                  <ArrowDownUp className="h-6 w-6 text-muted-foreground mx-auto" />
                  <Label>Output (Token)</Label>
                  <Input type="text" value={outputAmount} readOnly disabled={loading} />
                  <Button className="w-full" onClick={handleTrade} disabled={loading}>
                    {loading ? "Processing..." : "Buy Token"}
                  </Button>
                </TabsContent>
                <TabsContent value="sell" className="space-y-4">
                  <Label>Input (Token)</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    disabled={loading}
                  />
                  <ArrowDownUp className="h-6 w-6 text-muted-foreground mx-auto" />
                  <Label>Output (ETH)</Label>
                  <Input type="text" value={outputAmount} readOnly disabled={loading} />
                  <Button className="w-full" onClick={handleTrade} disabled={loading}>
                    {loading ? "Processing..." : "Sell Token"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Statistics */}
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
            <CardContent>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Balance</span>
                <span className="font-medium">{parseFloat(balance).toFixed(2)} {tokenInfo?.symbol}</span>
              </div>
              {tokenInfo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token Reserves</span>
                    <span className="font-medium">{(Number(formatEther(tokenInfo.virtualTokenReserve)).toFixed(2))}  {tokenInfo?.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Virtual ETH Reserve</span>
                    <span className="font-medium">{formatEther(tokenInfo.virtualEthReserve)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">
                      {tokenInfo.migrated ? "Migrated to Uniswap" : "Active"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
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
                        {new Date(message.timestamp).toISOString()}
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
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
  );
}
