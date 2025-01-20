import { formatEther } from "ethers";

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class PriceDatabase {
  private bars: Map<string, Bar[]> = new Map();
  private readonly INITIAL_TOKEN_RESERVE = 1060000000*10**18; // 106 billion tokens
  private readonly INITIAL_ETH_RESERVE = 1.6*10**18; // 1.6 ETH in wei
  public readonly launchTime: number;
  
  constructor() {
    // Round to nearest minute
    this.launchTime = Math.floor(Date.now() / 60000) * 60000;
    this.initializeData();
  }

  private initializeData() {
    // Calculate initial price
    const initialPrice = Number(formatEther(this.INITIAL_ETH_RESERVE)) / 
                        Number(formatEther(this.INITIAL_TOKEN_RESERVE));
    
    // Initialize data for all supported timeframes
    const resolutions = ['1', '5', '15', '30', '60', '240', '1D'];
    resolutions.forEach(resolution => {
      const initialBar: Bar = {
        time: this.launchTime / 1000, // TradingView expects seconds
        open: initialPrice,
        high: initialPrice,
        low: initialPrice,
        close: initialPrice,
        volume: 0
      };
      this.bars.set(resolution, [initialBar]);
    });
  }

  private getIntervalInSeconds(resolution: string): number {
    if (resolution === '1D') return 86400;
    return parseInt(resolution) * 60;
  }

  public updatePrice(ethReserve: bigint, tokenReserve: bigint, timestamp: number = Date.now()) {
    const currentPrice = Number(formatEther(ethReserve)) / Number(formatEther(tokenReserve));
    const unixTime = Math.floor(timestamp / 1000);

    this.bars.forEach((bars, resolution) => {
      const interval = this.getIntervalInSeconds(resolution);
      const currentBarTime = Math.floor(unixTime / interval) * interval;
      const lastBar = bars[bars.length - 1];

      if (lastBar.time < currentBarTime) {
        // Create new bar
        const newBar: Bar = {
          time: currentBarTime,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice,
          volume: 0
        };
        bars.push(newBar);
      } else {
        // Update current bar
        lastBar.high = Math.max(lastBar.high, currentPrice);
        lastBar.low = Math.min(lastBar.low, currentPrice);
        lastBar.close = currentPrice;
      }
    });
  }

  public getBars(resolution: string, from: number, to: number): Bar[] {
    const bars = this.bars.get(resolution) || [];
    return bars.filter(bar => bar.time >= from && bar.time <= to);
  }

  public getLastBar(resolution: string): Bar | undefined {
    const bars = this.bars.get(resolution);
    if (!bars || bars.length === 0) return undefined;
    return bars[bars.length - 1];
  }
}